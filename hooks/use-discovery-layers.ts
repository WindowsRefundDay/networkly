'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  DiscoveryState,
  DiscoveryEvent,
  LayerId,
  LayerState,
  LayerItem,
  createInitialDiscoveryState,
} from '@/types/discovery'

const STORAGE_KEY = 'networkly_discovery_state'
const LAYER_ORDER: LayerId[] = [
  'query_generation',
  'web_search',
  'semantic_filter',
  'parallel_crawl',
  'ai_extraction',
  'db_sync',
]

interface UseDiscoveryLayersOptions {
  onOpportunityFound?: (opportunity: DiscoveryEvent) => void
  onComplete?: (count: number) => void
  persistState?: boolean
}

interface UseDiscoveryLayersReturn {
  state: DiscoveryState | null
  isActive: boolean
  activeLayer: LayerId | null
  startDiscovery: (query: string) => void
  stopDiscovery: () => void
  toggleLayerExpanded: (layerId: LayerId) => void
  clearState: () => void
}

function createInitialState(query: string): DiscoveryState {
  const layers = {} as Record<LayerId, LayerState>
  
  for (const id of LAYER_ORDER) {
    layers[id] = {
      id,
      name: getLayerName(id),
      status: 'pending',
      expanded: false,
      stats: {},
      items: [],
    }
  }

  return {
    id: `discovery_${Date.now()}`,
    query,
    startTime: Date.now(),
    status: 'idle',
    overallProgress: 0,
    foundCount: 0,
    isPersonalized: false,
    layers,
  }
}

function getLayerName(id: LayerId): string {
  const names: Record<LayerId, string> = {
    query_generation: 'Query Generation',
    web_search: 'Web Search',
    semantic_filter: 'Semantic Filter',
    parallel_crawl: 'Parallel Crawl',
    ai_extraction: 'AI Extraction',
    db_sync: 'Database Sync',
  }
  return names[id]
}

export function useDiscoveryLayers(options: UseDiscoveryLayersOptions = {}): UseDiscoveryLayersReturn {
  const { onOpportunityFound, onComplete, persistState = true } = options
  
  const [state, setState] = useState<DiscoveryState | null>(() => {
    // Try to restore from storage on initial load
    if (persistState && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as DiscoveryState
          // Only restore if it was running (not complete)
          if (parsed.status === 'running') {
            return parsed
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    return null
  })
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Persist state to sessionStorage
  useEffect(() => {
    if (persistState && state && typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  }, [state, persistState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const isActive = state?.status === 'running'
  
  const activeLayer = state
    ? LAYER_ORDER.find((id) => state.layers[id]?.status === 'running') ?? null
    : null

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const processEvent = useCallback((event: DiscoveryEvent) => {
    setState((prev) => {
      if (!prev) return prev
      
      const newState = { ...prev }
      
      switch (event.type) {
        // Legacy events - map to layer system
        case 'plan': {
          const message = (event as { message?: string }).message || ''
          
          // Detect which layer based on message content
          if (message.includes('query') || message.includes('Query')) {
            newState.layers.query_generation = {
              ...newState.layers.query_generation,
              status: 'running',
              expanded: true,
              message,
            }
          } else if (message.includes('Search') || message.includes('search')) {
            newState.layers.query_generation.status = 'complete'
            newState.layers.query_generation.expanded = false
            newState.layers.web_search = {
              ...newState.layers.web_search,
              status: 'running',
              expanded: true,
              message,
            }
          } else if (message.includes('Semantic') || message.includes('filter')) {
            newState.layers.web_search.status = 'complete'
            newState.layers.web_search.expanded = false
            newState.layers.semantic_filter = {
              ...newState.layers.semantic_filter,
              status: 'running',
              expanded: true,
              message,
            }
          } else if (message.includes('Crawl') || message.includes('crawl') || message.includes('Analyzing')) {
            newState.layers.semantic_filter.status = 'complete'
            newState.layers.semantic_filter.expanded = false
            newState.layers.parallel_crawl = {
              ...newState.layers.parallel_crawl,
              status: 'running',
              expanded: true,
              message,
            }
          }
          break
        }

        case 'search': {
          const query = (event as { query?: string }).query
          newState.layers.web_search.status = 'running'
          newState.layers.web_search.expanded = true
          if (query) {
            const existingItems = newState.layers.web_search.items || []
            const exists = existingItems.some((item) => item.label === query)
            if (!exists) {
              newState.layers.web_search.items = [
                ...existingItems,
                { id: `q_${Date.now()}`, label: query, status: 'running' },
              ]
            }
          }
          break
        }

        case 'found': {
          const { url, source } = event as { url?: string; source?: string }
          if (url) {
            const existingItems = newState.layers.web_search.items || []
            newState.layers.web_search.items = [
              ...existingItems,
              { id: url, label: source || url, status: 'success', url },
            ]
            newState.layers.web_search.stats = {
              ...newState.layers.web_search.stats,
              total: (newState.layers.web_search.stats.total || 0) + 1,
            }
          }
          break
        }

        case 'analyzing': {
          const url = (event as { url?: string }).url
          if (url) {
            // Move to crawl layer
            newState.layers.parallel_crawl.status = 'running'
            newState.layers.parallel_crawl.expanded = true
            
            const existingItems = newState.layers.parallel_crawl.items || []
            const exists = existingItems.some((item) => item.id === url)
            if (!exists) {
              newState.layers.parallel_crawl.items = [
                ...existingItems,
                { id: url, label: getDomain(url), status: 'running', url },
              ]
            }
          }
          break
        }

        case 'extracted': {
          const card = (event as { card?: { title: string } }).card
          if (card) {
            // Move to extraction layer
            newState.layers.ai_extraction.status = 'running'
            newState.layers.ai_extraction.expanded = true
            
            const existingItems = newState.layers.ai_extraction.items || []
            newState.layers.ai_extraction.items = [
              ...existingItems,
              { id: `ext_${Date.now()}`, label: card.title, status: 'success' },
            ]
          }
          break
        }

        case 'opportunity_found': {
          const opp = event as {
            id?: string
            title?: string
            confidence?: number
            url?: string
          }
          
          newState.foundCount += 1
          newState.layers.ai_extraction.status = 'running'
          newState.layers.ai_extraction.expanded = true
          
          // Update crawl item to success
          if (opp.url) {
            newState.layers.parallel_crawl.items = newState.layers.parallel_crawl.items.map(
              (item) => item.url === opp.url ? { ...item, status: 'success' } : item
            )
          }
          
          // Add to extraction layer
          const existingItems = newState.layers.ai_extraction.items || []
          newState.layers.ai_extraction.items = [
            ...existingItems,
            {
              id: opp.id || `opp_${Date.now()}`,
              label: opp.title || 'Opportunity',
              status: 'success',
              confidence: opp.confidence,
              url: opp.url,
            },
          ]
          
          onOpportunityFound?.(event)
          break
        }

        case 'complete':
        case 'done': {
          const count = (event as { count?: number }).count || newState.foundCount
          
          // Mark all layers as complete
          for (const id of LAYER_ORDER) {
            if (newState.layers[id].status === 'running') {
              newState.layers[id].status = 'complete'
            }
          }
          
          // Collapse all except last active
          for (const id of LAYER_ORDER) {
            newState.layers[id].expanded = false
          }
          
          newState.status = 'complete'
          newState.endTime = Date.now()
          newState.overallProgress = 100
          newState.foundCount = count
          
          onComplete?.(count)
          break
        }

        case 'error': {
          const message = (event as { message?: string }).message
          // Find the currently running layer and mark it as error
          for (const id of LAYER_ORDER) {
            if (newState.layers[id].status === 'running') {
              newState.layers[id].status = 'error'
              newState.layers[id].message = message
              break
            }
          }
          break
        }

        // New layer events
        case 'layer_start': {
          const { layer, message } = event as { layer: LayerId; message: string }
          if (layer && newState.layers[layer]) {
            // Collapse previous layer
            const prevIndex = LAYER_ORDER.indexOf(layer) - 1
            if (prevIndex >= 0) {
              const prevLayer = LAYER_ORDER[prevIndex]
              newState.layers[prevLayer].status = 'complete'
              newState.layers[prevLayer].expanded = false
            }
            
            newState.layers[layer] = {
              ...newState.layers[layer],
              status: 'running',
              expanded: true,
              startTime: Date.now(),
              message,
            }
          }
          break
        }

        case 'layer_progress': {
          const { layer, item, status, current, total, confidence, title, url, error } = event as {
            layer: LayerId
            item?: string
            status: 'running' | 'complete' | 'failed'
            current?: number
            total?: number
            confidence?: number
            title?: string
            url?: string
            error?: string
          }
          
          if (layer && newState.layers[layer]) {
            const layerState = newState.layers[layer]
            
            if (current !== undefined && total !== undefined) {
              layerState.stats = { ...layerState.stats, completed: current, total }
            }
            
            if (item) {
              const existingIndex = layerState.items.findIndex((i) => i.label === item || i.id === item)
              const newItem: LayerItem = {
                id: item,
                label: title || item,
                status: status === 'complete' ? 'success' : status === 'failed' ? 'failed' : 'running',
                confidence,
                url,
                error,
              }
              
              if (existingIndex >= 0) {
                layerState.items[existingIndex] = { ...layerState.items[existingIndex], ...newItem }
              } else {
                layerState.items.push(newItem)
              }
            }
          }
          break
        }

        case 'layer_complete': {
          const { layer, stats, items } = event as {
            layer: LayerId
            stats: Partial<LayerState['stats']>
            items?: string[]
          }
          
          if (layer && newState.layers[layer]) {
            newState.layers[layer] = {
              ...newState.layers[layer],
              status: 'complete',
              expanded: false,
              duration: Date.now() - (newState.layers[layer].startTime || newState.startTime),
              stats: { ...newState.layers[layer].stats, ...stats },
            }
            
            if (items) {
              newState.layers[layer].items = items.map((item) => ({
                id: item,
                label: item,
                status: 'success' as const,
              }))
            }
          }
          break
        }

        case 'parallel_status': {
          const { layer, active, completed, failed, pending, activeUrls } = event as {
            layer: LayerId
            active: number
            completed: number
            failed: number
            pending: number
            activeUrls?: string[]
          }
          
          if (layer && newState.layers[layer]) {
            newState.layers[layer].stats = {
              ...newState.layers[layer].stats,
              total: active + completed + failed + pending,
              completed,
              failed,
              active: activeUrls,
            }
          }
          break
        }

        case 'reasoning': {
          const { layer, thought } = event as { layer: LayerId; thought: string }
          if (layer && newState.layers[layer]) {
            newState.layers[layer].reasoning = thought
          }
          break
        }
      }
      
      // Calculate overall progress
      const completedLayers = LAYER_ORDER.filter(
        (id) => newState.layers[id].status === 'complete'
      ).length
      const runningLayers = LAYER_ORDER.filter(
        (id) => newState.layers[id].status === 'running'
      ).length
      newState.overallProgress = Math.round(
        ((completedLayers + runningLayers * 0.5) / LAYER_ORDER.length) * 100
      )
      
      return newState
    })
  }, [onOpportunityFound, onComplete])

  const startDiscovery = useCallback((query: string) => {
    cleanup()
    
    const initialState = createInitialState(query)
    initialState.status = 'running'
    setState(initialState)
    
    const es = new EventSource(`/api/discovery/stream?query=${encodeURIComponent(query)}`)
    eventSourceRef.current = es
    
    // Timeout after 90 seconds
    timeoutRef.current = setTimeout(() => {
      es.close()
      processEvent({ type: 'complete', count: 0 } as DiscoveryEvent)
    }, 90_000)
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as DiscoveryEvent
        processEvent(data)
      } catch (e) {
        console.error('[Discovery] Parse error:', e)
      }
    }
    
    es.onerror = () => {
      cleanup()
      setState((prev) => {
        if (!prev || prev.status === 'complete') return prev
        return { ...prev, status: 'complete', endTime: Date.now() }
      })
    }
  }, [cleanup, processEvent])

  const stopDiscovery = useCallback(() => {
    cleanup()
    setState((prev) => {
      if (!prev) return prev
      return { ...prev, status: 'complete', endTime: Date.now() }
    })
  }, [cleanup])

  const toggleLayerExpanded = useCallback((layerId: LayerId) => {
    setState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        layers: {
          ...prev.layers,
          [layerId]: {
            ...prev.layers[layerId],
            expanded: !prev.layers[layerId].expanded,
          },
        },
      }
    })
  }, [])

  const clearState = useCallback(() => {
    cleanup()
    setState(null)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [cleanup])

  return {
    state,
    isActive,
    activeLayer,
    startDiscovery,
    stopDiscovery,
    toggleLayerExpanded,
    clearState,
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url.slice(0, 30)
  }
}
