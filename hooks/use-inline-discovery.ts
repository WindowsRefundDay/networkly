'use client'

/**
 * useInlineDiscovery - Hook for running discovery within chat interface
 * 
 * A simplified version of useDiscoveryLayers optimized for inline chat display.
 * Shows minimal UI but tracks progress and found opportunities.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { InlineOpportunity } from '@/components/assistant/opportunity-card-inline'

export interface DiscoveryProgress {
  status: 'idle' | 'running' | 'complete' | 'error'
  foundCount: number
  opportunities: InlineOpportunity[]
  message: string
  progress: number // 0-100
  currentLayer: string | null
}

interface UseInlineDiscoveryOptions {
  onOpportunityFound?: (opportunity: InlineOpportunity) => void
  onComplete?: (opportunities: InlineOpportunity[]) => void
  onError?: (error: string) => void
}

interface UseInlineDiscoveryReturn {
  progress: DiscoveryProgress
  isActive: boolean
  startDiscovery: (query: string) => void
  stopDiscovery: () => void
}

const INITIAL_PROGRESS: DiscoveryProgress = {
  status: 'idle',
  foundCount: 0,
  opportunities: [],
  message: '',
  progress: 0,
  currentLayer: null,
}

// Layer order for progress calculation
const LAYER_ORDER = [
  'query_generation',
  'web_search',
  'semantic_filter',
  'parallel_crawl',
  'ai_extraction',
  'db_sync',
]

// Friendly layer names
const LAYER_MESSAGES: Record<string, string> = {
  query_generation: 'Generating search queries...',
  web_search: 'Searching the web...',
  semantic_filter: 'Filtering results...',
  parallel_crawl: 'Fetching opportunities...',
  ai_extraction: 'Analyzing with AI...',
  db_sync: 'Saving to database...',
}

export function useInlineDiscovery(options: UseInlineDiscoveryOptions = {}): UseInlineDiscoveryReturn {
  const { onOpportunityFound, onComplete, onError } = options

  const [progress, setProgress] = useState<DiscoveryProgress>(INITIAL_PROGRESS)
  const eventSourceRef = useRef<EventSource | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const opportunitiesRef = useRef<InlineOpportunity[]>([])

  const isActive = progress.status === 'running'

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

  const startDiscovery = useCallback((query: string) => {
    cleanup()
    opportunitiesRef.current = []

    setProgress({
      status: 'running',
      foundCount: 0,
      opportunities: [],
      message: 'Starting discovery...',
      progress: 5,
      currentLayer: null,
    })

    const es = new EventSource(`/api/discovery/stream?query=${encodeURIComponent(query)}`)
    eventSourceRef.current = es

    // Timeout after 2 minutes
    timeoutRef.current = setTimeout(() => {
      es.close()
      setProgress(prev => ({
        ...prev,
        status: 'complete',
        message: `Found ${prev.foundCount} opportunities`,
      }))
      onComplete?.(opportunitiesRef.current)
    }, 120_000)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'plan':
            setProgress(prev => ({
              ...prev,
              message: data.message || prev.message,
            }))
            break

          case 'layer_start': {
            const layerIndex = LAYER_ORDER.indexOf(data.layer)
            const progressPercent = Math.round(((layerIndex + 0.5) / LAYER_ORDER.length) * 100)
            
            setProgress(prev => ({
              ...prev,
              currentLayer: data.layer,
              message: LAYER_MESSAGES[data.layer] || data.message,
              progress: progressPercent,
            }))
            break
          }

          case 'layer_complete': {
            const layerIndex = LAYER_ORDER.indexOf(data.layer)
            const progressPercent = Math.round(((layerIndex + 1) / LAYER_ORDER.length) * 100)
            
            setProgress(prev => ({
              ...prev,
              progress: Math.max(prev.progress, progressPercent),
            }))
            break
          }

          case 'opportunity_found': {
            const opportunity: InlineOpportunity = {
              id: data.id,
              title: data.title,
              organization: data.organization,
              location: data.locationType || 'Unknown',
              type: data.opportunityType || data.category,
              category: data.category,
              deadline: data.deadline || null,
              description: data.summary,
            }

            opportunitiesRef.current.push(opportunity)

            setProgress(prev => ({
              ...prev,
              foundCount: prev.foundCount + 1,
              opportunities: [...opportunitiesRef.current],
              message: `Found ${prev.foundCount + 1} opportunities...`,
            }))

            onOpportunityFound?.(opportunity)
            break
          }

          case 'complete':
          case 'done': {
            cleanup()
            const finalCount = data.count ?? opportunitiesRef.current.length
            
            setProgress(prev => ({
              ...prev,
              status: 'complete',
              foundCount: finalCount,
              progress: 100,
              message: finalCount > 0 
                ? `Found ${finalCount} opportunities!`
                : 'No new opportunities found',
              currentLayer: null,
            }))

            onComplete?.(opportunitiesRef.current)
            break
          }

          case 'error': {
            cleanup()
            setProgress(prev => ({
              ...prev,
              status: 'error',
              message: data.message || 'Discovery failed',
            }))
            onError?.(data.message || 'Discovery failed')
            break
          }
        }
      } catch (e) {
        console.error('[InlineDiscovery] Parse error:', e)
      }
    }

    es.onerror = () => {
      cleanup()
      setProgress(prev => {
        if (prev.status === 'complete') return prev
        return {
          ...prev,
          status: prev.foundCount > 0 ? 'complete' : 'error',
          message: prev.foundCount > 0 
            ? `Found ${prev.foundCount} opportunities`
            : 'Connection lost',
        }
      })
    }
  }, [cleanup, onOpportunityFound, onComplete, onError])

  const stopDiscovery = useCallback(() => {
    cleanup()
    setProgress(prev => ({
      ...prev,
      status: 'complete',
      message: prev.foundCount > 0 
        ? `Found ${prev.foundCount} opportunities`
        : 'Discovery stopped',
    }))
    onComplete?.(opportunitiesRef.current)
  }, [cleanup, onComplete])

  return {
    progress,
    isActive,
    startDiscovery,
    stopDiscovery,
  }
}
