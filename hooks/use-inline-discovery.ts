'use client'

/**
 * useInlineDiscovery - Hook for running discovery within chat interface.
 *
 * IMPORTANT: The backend sends NAMED SSE events (e.g. `event: opportunity_found`).
 * Named events are NOT dispatched to `onmessage` — they need `addEventListener`.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { InlineOpportunity } from '@/components/assistant/opportunity-card-inline'

export interface DiscoveryProgress {
  status: 'idle' | 'running' | 'complete' | 'error'
  foundCount: number
  opportunities: InlineOpportunity[]
  message: string
  progress: number
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
  startDiscovery: (query: string, personalizationWeight?: number) => void
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

const LAYER_ORDER = [
  'query_generation',
  'web_search',
  'semantic_filter',
  'parallel_crawl',
  'ai_extraction',
  'db_sync',
]

const LAYER_MESSAGES: Record<string, string> = {
  query_generation: 'Generating search queries...',
  web_search: 'Searching the web...',
  semantic_filter: 'Filtering results...',
  parallel_crawl: 'Fetching opportunities...',
  ai_extraction: 'Analyzing with AI...',
  db_sync: 'Saving to database...',
}

const EVENT_TYPES = [
  'layer_start', 'layer_progress', 'layer_complete',
  'plan', 'search', 'evaluating', 'extracting',
  'opportunity_found', 'found', 'complete', 'done', 'error', 'message',
]

export function useInlineDiscovery(options: UseInlineDiscoveryOptions = {}): UseInlineDiscoveryReturn {
  const { onOpportunityFound, onComplete, onError } = options

  const onOpportunityFoundRef = useRef(onOpportunityFound)
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)
  useEffect(() => { onOpportunityFoundRef.current = onOpportunityFound }, [onOpportunityFound])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  const [progress, setProgress] = useState<DiscoveryProgress>(INITIAL_PROGRESS)
  const eventSourceRef = useRef<EventSource | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const opportunitiesRef = useRef<InlineOpportunity[]>([])

  const isActive = progress.status === 'running'

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

  const startDiscovery = useCallback((query: string, personalizationWeight: number = 1.0) => {
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

    let completed = false
    const finish = () => {
      if (completed) return
      completed = true
      cleanup()
      const actualCount = opportunitiesRef.current.length
      setProgress((prev) => ({
        ...prev,
        status: 'complete',
        foundCount: actualCount,
        progress: 100,
        message: actualCount > 0 ? `Found ${actualCount} opportunities!` : 'No new opportunities found',
        currentLayer: null,
      }))
      onCompleteRef.current?.(opportunitiesRef.current)
    }

    // ── Fast search (database) ──────────────────────────────────
    fetch(`/api/discovery/search?query=${encodeURIComponent(query)}&limit=15&threshold=0.5&personalizationWeight=${personalizationWeight}`)
      .then((res) => res.json())
      .then((data: { results?: Array<{ id: string; title: string; description?: string; url?: string; organization?: string; locationType?: string; category?: string; opportunityType?: string }> }) => {
        const results = data.results || []
        for (const result of results) {
          if (!result.title?.trim()) continue
          const opp: InlineOpportunity = {
            id: result.id,
            title: result.title,
            organization: result.organization || '',
            location: result.locationType || 'Unknown',
            type: result.opportunityType || result.category || '',
            category: result.category,
            deadline: null,
            description: result.description,
          }
          if (!opportunitiesRef.current.some((o) => o.id === opp.id)) {
            opportunitiesRef.current.push(opp)
            onOpportunityFoundRef.current?.(opp)
          }
        }
        setProgress((prev) => ({
          ...prev,
          foundCount: opportunitiesRef.current.length,
          opportunities: [...opportunitiesRef.current],
          message: opportunitiesRef.current.length > 0
            ? `Found ${opportunitiesRef.current.length} opportunities...`
            : prev.message,
        }))
      })
      .catch((err) => console.error('[InlineDiscovery] Fast search failed:', err))

    // ── SSE stream (web scraping) with auto-reconnect ──────────
    const streamUrl = `/api/discovery/stream?query=${encodeURIComponent(query)}&personalizationWeight=${personalizationWeight}`
    let receivedAnyStreamEvent = false
    let retryCount = 0
    const MAX_RETRIES = 3
    const RETRY_DELAY_MS = 2000

    const handleEvent = (event: MessageEvent) => {
      if (completed) return
      receivedAnyStreamEvent = true
      try {
        if (!event.data || event.data === 'undefined') return
        const data = JSON.parse(event.data)
        const eventType = data.type || event.type

        switch (eventType) {
          case 'plan':
            setProgress((prev) => ({ ...prev, message: data.message || prev.message }))
            break

          case 'layer_start': {
            const layerIndex = LAYER_ORDER.indexOf(data.layer)
            const progressPercent = Math.round(((layerIndex + 0.5) / LAYER_ORDER.length) * 100)
            setProgress((prev) => ({
              ...prev,
              currentLayer: data.layer,
              message: LAYER_MESSAGES[data.layer] || data.message,
              progress: Math.max(prev.progress, progressPercent),
            }))
            break
          }

          case 'layer_complete': {
            const layerIndex = LAYER_ORDER.indexOf(data.layer)
            const progressPercent = Math.round(((layerIndex + 1) / LAYER_ORDER.length) * 100)
            setProgress((prev) => ({
              ...prev,
              progress: Math.max(prev.progress, progressPercent),
            }))
            break
          }

          case 'opportunity_found': {
            let displayTitle = data.title?.trim() || ''
            if (!displayTitle && data.url) {
              try {
                displayTitle = new URL(data.url).hostname.replace('www.', '')
              } catch {
                displayTitle = 'Untitled'
              }
            }
            if (!displayTitle) break

            const opp: InlineOpportunity = {
              id: data.id || data.url || `opp_${Date.now()}`,
              title: displayTitle,
              organization: data.organization,
              location: data.locationType || 'Unknown',
              type: data.opportunityType || data.category,
              category: data.category,
              deadline: data.deadline || null,
              description: data.summary,
            }

            if (!opportunitiesRef.current.some((o) => o.id === opp.id || o.title.toLowerCase() === opp.title.toLowerCase())) {
              opportunitiesRef.current.push(opp)
              setProgress((prev) => ({
                ...prev,
                foundCount: opportunitiesRef.current.length,
                opportunities: [...opportunitiesRef.current],
                message: `Found ${opportunitiesRef.current.length} opportunities...`,
              }))
              onOpportunityFoundRef.current?.(opp)
            }
            break
          }

          case 'complete':
          case 'done':
            finish()
            break

          case 'error':
            if (data.source === 'stderr') break
            cleanup()
            setProgress((prev) => ({
              ...prev,
              status: 'error',
              message: data.message || 'Discovery failed',
            }))
            onErrorRef.current?.(data.message || 'Discovery failed')
            break
        }
      } catch (e) {
        console.error('[InlineDiscovery] Parse error:', e)
      }
    }

    function connectStream() {
      if (completed) return
      const es = new EventSource(streamUrl)
      eventSourceRef.current = es
      EVENT_TYPES.forEach((type) => es.addEventListener(type, handleEvent))

      es.onerror = () => {
        const readyState = es.readyState
        console.log(`[InlineDiscovery] EventSource onerror. readyState: ${readyState}, retry: ${retryCount}, hadEvents: ${receivedAnyStreamEvent}`)
        es.close()

        if (completed) return

        // Stream closed after receiving data — likely normal completion
        if (receivedAnyStreamEvent && readyState === EventSource.CLOSED) {
          setTimeout(() => { if (!completed) finish() }, 500)
          return
        }

        // Connection dropped — retry
        if (retryCount < MAX_RETRIES) {
          retryCount++
          console.log(`[InlineDiscovery] Reconnecting in ${RETRY_DELAY_MS}ms (attempt ${retryCount}/${MAX_RETRIES})...`)
          setTimeout(() => { if (!completed) connectStream() }, RETRY_DELAY_MS)
        } else {
          finish()
        }
      }
    }

    connectStream()

    // 90s hard client timeout
    timeoutRef.current = setTimeout(() => finish(), 90_000)
  }, [cleanup])

  const stopDiscovery = useCallback(() => {
    cleanup()
    const actualCount = opportunitiesRef.current.length
    setProgress((prev) => ({
      ...prev,
      status: 'complete',
      progress: 100,
      message: actualCount > 0 ? `Found ${actualCount} opportunities` : 'Discovery stopped',
    }))
    onCompleteRef.current?.(opportunitiesRef.current)
  }, [cleanup])

  return { progress, isActive, startDiscovery, stopDiscovery }
}
