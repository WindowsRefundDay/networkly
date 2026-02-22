'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  DiscoveryState,
  DiscoveryEvent,
  LayerId,
  LayerState,
} from '@/types/discovery'

const LAYER_ORDER: LayerId[] = [
  'database_search',
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
  existingIds?: Set<string>
  existingTitles?: Set<string>
}

interface UseDiscoveryLayersReturn {
  state: DiscoveryState | null
  isActive: boolean
  activeLayer: LayerId | null
  startDiscovery: (query: string, options?: { isPersonalized?: boolean; userProfileId?: string; personalizationWeight?: number }) => void
  stopDiscovery: () => void
  toggleLayerExpanded: (layerId: LayerId) => void
  clearState: () => void
}

function createInitialState(query: string, isPersonalized: boolean = false): DiscoveryState {
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
    isPersonalized,
    layers,
  }
}

function getLayerName(id: LayerId): string {
  const names: Record<LayerId, string> = {
    database_search: 'Database Search',
    query_generation: 'Query Generation',
    web_search: 'Web Search',
    semantic_filter: 'Semantic Filter',
    parallel_crawl: 'Parallel Crawl',
    ai_extraction: 'AI Extraction',
    db_sync: 'Database Sync',
  }
  return names[id]
}

/**
 * Pure state reducer — takes previous state + event, returns new state.
 */
function reduceEvent(prev: DiscoveryState, event: DiscoveryEvent): DiscoveryState {
  const newState = { ...prev }

  switch (event.type) {
    case 'plan': {
      const message = (event as { message?: string }).message || ''
      // Mark query_generation as running
      newState.layers.query_generation = {
        ...newState.layers.query_generation,
        status: 'running',
        expanded: true,
        message,
      }
      break
    }

    case 'search': {
      const query = (event as { query?: string }).query
      newState.layers.query_generation.status = 'complete'
      newState.layers.query_generation.expanded = false
      newState.layers.web_search.status = 'running'
      newState.layers.web_search.expanded = true
      if (query) {
        const existingItems = newState.layers.web_search.items || []
        if (!existingItems.some((item) => item.label === query)) {
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
          { id: `url_${Date.now()}`, label: source || url, status: 'success', url },
        ]
      }
      break
    }

    case 'evaluating':
    case 'analyzing': {
      const url = (event as { url?: string }).url
      if (url) {
        newState.layers.parallel_crawl.status = 'running'
        newState.layers.parallel_crawl.expanded = true
        const existingItems = newState.layers.parallel_crawl.items || []
        if (!existingItems.some((item) => item.url === url)) {
          newState.layers.parallel_crawl.items = [
            ...existingItems,
            { id: `crawl_${Date.now()}`, label: getDomain(url), status: 'running', url },
          ]
        }
      }
      break
    }

    case 'extracting':
    case 'extracted': {
      const url = (event as { url?: string }).url
      if (url) {
        newState.layers.ai_extraction.status = 'running'
        newState.layers.ai_extraction.expanded = true
        const existingItems = newState.layers.ai_extraction.items || []
        newState.layers.ai_extraction.items = [
          ...existingItems,
          { id: `ext_${Date.now()}`, label: getDomain(url), status: 'running', url },
        ]
      }
      break
    }

    case 'opportunity_found': {
      const opp = event as {
        id?: string; title?: string; confidence?: number
        similarity?: number; url?: string; source?: string
      }

      let displayTitle = opp.title?.trim() || ''
      if (!displayTitle && opp.url) {
        try {
          displayTitle = new URL(opp.url).hostname.replace('www.', '')
        } catch {
          displayTitle = 'Untitled Opportunity'
        }
      }
      if (!displayTitle) displayTitle = 'Untitled Opportunity'

      newState.foundCount += 1
      const confidence = opp.confidence ?? opp.similarity

      if (opp.source === 'database') {
        newState.layers.database_search.status = 'running'
        newState.layers.database_search.items = [
          ...newState.layers.database_search.items,
          {
            id: opp.id || `opp_db_${Date.now()}`,
            label: displayTitle,
            status: 'success',
            confidence: confidence || 1.0,
            url: opp.url,
          },
        ]
      } else {
        newState.layers.ai_extraction.status = 'running'
        newState.layers.ai_extraction.expanded = true
        newState.layers.ai_extraction.items = [
          ...newState.layers.ai_extraction.items,
          {
            id: opp.id || `opp_${Date.now()}`,
            label: displayTitle,
            status: 'success',
            confidence,
            url: opp.url,
          },
        ]
      }
      break
    }

    case 'complete':
    case 'done': {
      for (const id of LAYER_ORDER) {
        if (newState.layers[id].status === 'running') {
          newState.layers[id].status = 'complete'
        }
        newState.layers[id].expanded = false
      }
      newState.status = 'complete'
      newState.endTime = Date.now()
      newState.overallProgress = 100
      // IMPORTANT: Keep accumulated foundCount — do NOT override with backend count
      break
    }

    case 'error': {
      const { message, source } = event as { message?: string; source?: string }
      if (source === 'stderr') break // ignore stderr noise
      for (const id of LAYER_ORDER) {
        if (newState.layers[id].status === 'running') {
          newState.layers[id].status = 'error'
          newState.layers[id].message = message
          break
        }
      }
      break
    }

    case 'layer_start': {
      const { layer, message } = event as { layer: LayerId; message: string }
      if (layer && newState.layers[layer]) {
        // Complete previous layer
        const prevIndex = LAYER_ORDER.indexOf(layer) - 1
        if (prevIndex >= 0) {
          const prevLayer = LAYER_ORDER[prevIndex]
          if (newState.layers[prevLayer].status === 'running') {
            newState.layers[prevLayer].status = 'complete'
            newState.layers[prevLayer].expanded = false
          }
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
        layer: LayerId; item?: string; status: 'running' | 'complete' | 'failed'
        current?: number; total?: number; confidence?: number; title?: string; url?: string; error?: string
      }
      if (layer && newState.layers[layer]) {
        const layerState = newState.layers[layer]
        if (current !== undefined && total !== undefined) {
          layerState.stats = { ...layerState.stats, completed: current, total }
        }
        if (item) {
          const existingIndex = url
            ? layerState.items.findIndex((i) => i.url === url)
            : layerState.items.findIndex((i) => i.label === item)

          if (existingIndex >= 0) {
            layerState.items[existingIndex] = {
              ...layerState.items[existingIndex],
              label: title || item,
              status: status === 'complete' ? 'success' : status === 'failed' ? 'failed' : 'running',
              confidence, url, error,
            }
          } else {
            layerState.items.push({
              id: `${layer}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              label: title || item,
              status: status === 'complete' ? 'success' : status === 'failed' ? 'failed' : 'running',
              confidence, url, error,
            })
          }
        }
      }
      break
    }

    case 'layer_complete': {
      const { layer, stats, items } = event as {
        layer: LayerId; stats: Partial<LayerState['stats']>; items?: string[]
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
          newState.layers[layer].items = items.map((item, index) => ({
            id: `${layer}_complete_${index}`,
            label: item,
            status: 'success' as const,
          }))
        }
      }
      break
    }

    case 'parallel_status': {
      const { layer, active, completed, failed, pending, activeUrls } = event as {
        layer: LayerId; active: number; completed: number; failed: number; pending: number; activeUrls?: string[]
      }
      if (layer && newState.layers[layer]) {
        newState.layers[layer].stats = {
          ...newState.layers[layer].stats,
          total: active + completed + failed + pending,
          completed, failed, active: activeUrls,
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

  // Recalculate progress
  const completedLayers = LAYER_ORDER.filter((id) => newState.layers[id].status === 'complete').length
  const runningLayers = LAYER_ORDER.filter((id) => newState.layers[id].status === 'running').length
  newState.overallProgress = Math.round(
    ((completedLayers + runningLayers * 0.5) / LAYER_ORDER.length) * 100
  )

  return newState
}

export function useDiscoveryLayers(options: UseDiscoveryLayersOptions = {}): UseDiscoveryLayersReturn {
  const { onOpportunityFound, onComplete, existingIds, existingTitles } = options

  // Refs for callbacks to avoid stale closures
  const onOpportunityFoundRef = useRef(onOpportunityFound)
  const onCompleteRef = useRef(onComplete)
  const existingTitlesRef = useRef(existingTitles)
  useEffect(() => { onOpportunityFoundRef.current = onOpportunityFound }, [onOpportunityFound])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  useEffect(() => { existingTitlesRef.current = existingTitles }, [existingTitles])

  const [state, setState] = useState<DiscoveryState | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  useEffect(() => () => cleanup(), [cleanup])

  /**
   * Process a discovery event: update state, then fire callbacks outside setState.
   */
  const processEvent = useCallback((event: DiscoveryEvent) => {
    setState((prev) => {
      if (!prev) return prev
      return reduceEvent(prev, event)
    })

    // Fire callbacks outside setState (via microtask)
    if (event.type === 'opportunity_found') {
      const oppEvent = event as { id?: string; url?: string; title?: string }
      if (oppEvent.id || oppEvent.url) {
        queueMicrotask(() => onOpportunityFoundRef.current?.(event))
      }
    } else if (event.type === 'complete' || event.type === 'done') {
      queueMicrotask(() => {
        setState((currentState) => {
          const count = currentState?.foundCount ?? 0
          setTimeout(() => onCompleteRef.current?.(count), 0)
          return currentState
        })
      })
    }
  }, [])

  const startDiscovery = useCallback((query: string, options: { isPersonalized?: boolean; userProfileId?: string; personalizationWeight?: number } = {}) => {
    cleanup()

    const { isPersonalized = false, userProfileId, personalizationWeight = 1.0 } = options
    const initialState = createInitialState(query, isPersonalized)
    initialState.status = 'running'
    setState(initialState)

    // Dedup tracking
    const seenIdsRef = new Set<string>()
    const seenTitlesRef = new Set<string>(existingTitlesRef.current || [])

    let completed = false
    const finishDiscovery = () => {
      if (completed) return
      completed = true
      cleanup()
      processEvent({ type: 'complete', count: 0 } as DiscoveryEvent)
    }

    // ════════════════════════════════════════════════════════════════
    // FAST PATH: Direct database search (Supabase text search, <1s)
    // This is the PRIMARY source of results.
    // ════════════════════════════════════════════════════════════════
    let fastSearchUrl = `/api/discovery/search?query=${encodeURIComponent(query)}&limit=20&threshold=0.5&personalizationWeight=${personalizationWeight}`
    if (userProfileId) {
      fastSearchUrl += `&userProfileId=${encodeURIComponent(userProfileId)}`
    }
    fetch(fastSearchUrl)
      .then((res) => res.json())
      .then((data: { results?: Array<{ id: string; title: string; description?: string; url?: string; similarity?: number; organization?: string; category?: string; locationType?: string; opportunityType?: string }> }) => {
        const results = data.results || []
        console.log('[Discovery] Fast search returned', results.length, 'results')

        for (const result of results) {
          if (!result.title || result.title.trim() === '') continue
          if (seenIdsRef.has(result.id)) continue
          const titleKey = result.title.trim().toLowerCase()
          if (seenTitlesRef.has(titleKey)) continue
          seenIdsRef.add(result.id)
          seenTitlesRef.add(titleKey)

          processEvent({
            type: 'opportunity_found',
            id: result.id,
            title: result.title,
            description: result.description || '',
            url: result.url || '',
            similarity: result.similarity || 0,
            confidence: result.similarity || 0,
            source: 'database',
            organization: result.organization || '',
            category: result.category || '',
            locationType: result.locationType || '',
            opportunityType: result.opportunityType || '',
            match_reasons: ['Database match'],
          } as unknown as DiscoveryEvent)
        }
      })
      .catch((err) => {
        console.error('[Discovery] Fast search failed:', err)
      })

    // ════════════════════════════════════════════════════════════════
    // SLOW PATH: Backend streaming pipeline (web scraping for new results)
    // The proxy will synthesise opportunity_found events from filtered URLs
    // if the backend's extraction stage stalls.
    // ════════════════════════════════════════════════════════════════
    let streamUrl = `/api/discovery/stream?query=${encodeURIComponent(query)}&personalizationWeight=${personalizationWeight}`
    if (isPersonalized && userProfileId) {
      streamUrl += `&userProfileId=${encodeURIComponent(userProfileId)}`
    }

    const EVENT_TYPES = [
      'layer_start', 'layer_progress', 'layer_complete',
      'plan', 'search', 'evaluating', 'extracting',
      'opportunity_found', 'found', 'complete', 'error', 'message',
    ]

    const handleEvent = (event: MessageEvent) => {
      if (completed) return
      try {
        if (!event.data || event.data === 'undefined') return
        const data = JSON.parse(event.data) as DiscoveryEvent
        if (event.type !== 'message' && !data.type) {
          (data as any).type = event.type
        }

        // Deduplicate opportunity_found
        if (data.type === 'opportunity_found') {
          const id = (data as any).id
          const title = (data as any).title
          if (id && seenIdsRef.has(id)) return
          if (title && title.trim() !== '') {
            const titleKey = title.trim().toLowerCase()
            if (seenTitlesRef.has(titleKey)) return
            seenTitlesRef.add(titleKey)
          }
          if (id) seenIdsRef.add(id)
        }

        if (data.type === 'complete' || data.type === 'done') {
          finishDiscovery()
          return
        }

        processEvent(data)
      } catch (e) {
        console.error('[Discovery] Parse error:', e)
      }
    }

    // ── Reconnection-resilient EventSource ──────────────────────
    let receivedAnyEvent = false
    let retryCount = 0
    const MAX_RETRIES = 3
    const RETRY_DELAY_MS = 2000

    function connectEventSource() {
      if (completed) return

      const es = new EventSource(streamUrl)
      eventSourceRef.current = es
      EVENT_TYPES.forEach((type) => es.addEventListener(type, (event: MessageEvent) => {
        receivedAnyEvent = true
        handleEvent(event)
      }))

      es.onerror = () => {
        const readyState = es.readyState
        console.log(`[Discovery] EventSource onerror. readyState: ${readyState}, retryCount: ${retryCount}, receivedAnyEvent: ${receivedAnyEvent}`)
        es.close()

        if (completed) return

        // If we received data and the stream closed (readyState=2), the backend
        // likely finished sending — treat as normal completion.
        if (receivedAnyEvent && readyState === EventSource.CLOSED) {
          console.log('[Discovery] Stream closed after receiving data — completing.')
          setTimeout(() => finishDiscovery(), 500)
          return
        }

        // Otherwise, the connection was dropped (HMR, network blip, etc).
        // Retry with a delay.
        if (retryCount < MAX_RETRIES) {
          retryCount++
          console.log(`[Discovery] Reconnecting in ${RETRY_DELAY_MS}ms (attempt ${retryCount}/${MAX_RETRIES})...`)
          setTimeout(() => {
            if (!completed) connectEventSource()
          }, RETRY_DELAY_MS)
        } else {
          console.log('[Discovery] Max retries exceeded — finishing.')
          finishDiscovery()
        }
      }
    }

    connectEventSource()

    // Hard client timeout — 90s (generous for slow networks)
    timeoutRef.current = setTimeout(() => {
      console.log('[Discovery] Client timeout — finishing')
      finishDiscovery()
    }, 90_000)
  }, [cleanup, processEvent])

  const stopDiscovery = useCallback(() => {
    cleanup()
    setState((prev) => {
      if (!prev) return prev
      return { ...prev, status: 'complete', endTime: Date.now(), overallProgress: 100 }
    })
  }, [cleanup])

  const toggleLayerExpanded = useCallback((layerId: LayerId) => {
    setState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        layers: {
          ...prev.layers,
          [layerId]: { ...prev.layers[layerId], expanded: !prev.layers[layerId].expanded },
        },
      }
    })
  }, [])

  const clearState = useCallback(() => {
    cleanup()
    setState(null)
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
