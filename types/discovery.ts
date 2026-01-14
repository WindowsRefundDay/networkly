/**
 * Discovery Layer Types
 * 
 * Defines the structure for the multi-layer discovery pipeline visualization.
 * Each layer represents a stage in the opportunity discovery process.
 */

// Layer identifiers
export type LayerId = 
  | 'query_generation'
  | 'web_search'
  | 'semantic_filter'
  | 'parallel_crawl'
  | 'ai_extraction'
  | 'db_sync'

// Layer status
export type LayerStatus = 'pending' | 'running' | 'complete' | 'error'

// Individual item within a layer (query, URL, opportunity, etc.)
export interface LayerItem {
  id: string
  label: string
  status: 'pending' | 'running' | 'success' | 'failed'
  confidence?: number
  details?: Record<string, unknown>
  url?: string
  error?: string
}

// Layer statistics
export interface LayerStats {
  count?: number
  total?: number
  completed?: number
  failed?: number
  skipped?: number
  active?: string[]
  threshold?: number
  input?: number
  output?: number
  inserted?: number
  updated?: number
  queries?: number
  fallback?: boolean
}

// State for a single layer
export interface LayerState {
  id: LayerId
  name: string
  status: LayerStatus
  startTime?: number
  duration?: number
  expanded: boolean
  message?: string
  reasoning?: string
  stats: LayerStats
  items: LayerItem[]
}

// Complete discovery state
export interface DiscoveryState {
  id: string
  query: string
  startTime: number
  endTime?: number
  status: 'idle' | 'running' | 'complete' | 'error'
  overallProgress: number
  foundCount: number
  isPersonalized: boolean
  layers: Record<LayerId, LayerState>
}

// SSE Event types from backend
export type DiscoveryEventType =
  | 'plan'
  | 'search'
  | 'found'
  | 'analyzing'
  | 'extracted'
  | 'opportunity_found'
  | 'complete'
  | 'done'
  | 'error'
  // New layer events
  | 'layer_start'
  | 'layer_progress'
  | 'layer_complete'
  | 'parallel_status'
  | 'reasoning'

// Base event structure
export interface DiscoveryEventBase {
  type: DiscoveryEventType
}

// Plan event (status messages)
export interface PlanEvent extends DiscoveryEventBase {
  type: 'plan'
  message: string
}

// Search event
export interface SearchEvent extends DiscoveryEventBase {
  type: 'search'
  query: string
}

// Found URL event
export interface FoundEvent extends DiscoveryEventBase {
  type: 'found'
  url: string
  source: string
}

// Analyzing event
export interface AnalyzingEvent extends DiscoveryEventBase {
  type: 'analyzing'
  url: string
}

// Extracted event
export interface ExtractedEvent extends DiscoveryEventBase {
  type: 'extracted'
  card: {
    title: string
    organization: string
    type: string
    location?: string
  }
}

// Opportunity found event
export interface OpportunityFoundEvent extends DiscoveryEventBase {
  type: 'opportunity_found'
  id: string
  title: string
  organization: string
  category: string
  opportunityType: string
  url: string
  deadline?: string
  summary: string
  locationType: string
  confidence: number
  isPersonalized: boolean
}

// Complete event
export interface CompleteEvent extends DiscoveryEventBase {
  type: 'complete'
  count: number
  isPersonalized?: boolean
  userId?: string
}

// Done event
export interface DoneEvent extends DiscoveryEventBase {
  type: 'done'
  code?: number
}

// Error event
export interface ErrorEvent extends DiscoveryEventBase {
  type: 'error'
  message: string
}

// Layer start event
export interface LayerStartEvent extends DiscoveryEventBase {
  type: 'layer_start'
  layer: LayerId
  message: string
}

// Layer progress event
export interface LayerProgressEvent extends DiscoveryEventBase {
  type: 'layer_progress'
  layer: LayerId
  item?: string
  status: 'running' | 'complete' | 'failed'
  current?: number
  total?: number
  count?: number
  confidence?: number
  title?: string
  url?: string
  error?: string
}

// Layer complete event
export interface LayerCompleteEvent extends DiscoveryEventBase {
  type: 'layer_complete'
  layer: LayerId
  stats: LayerStats
  items?: string[]
}

// Parallel status event
export interface ParallelStatusEvent extends DiscoveryEventBase {
  type: 'parallel_status'
  layer: LayerId
  active: number
  completed: number
  failed: number
  pending: number
  activeUrls?: string[]
}

// Reasoning event (AI thinking)
export interface ReasoningEvent extends DiscoveryEventBase {
  type: 'reasoning'
  layer: LayerId
  thought: string
}

// Union of all event types
export type DiscoveryEvent =
  | PlanEvent
  | SearchEvent
  | FoundEvent
  | AnalyzingEvent
  | ExtractedEvent
  | OpportunityFoundEvent
  | CompleteEvent
  | DoneEvent
  | ErrorEvent
  | LayerStartEvent
  | LayerProgressEvent
  | LayerCompleteEvent
  | ParallelStatusEvent
  | ReasoningEvent

// Layer metadata for display
export const LAYER_CONFIG: Record<LayerId, { name: string; icon: string; description: string }> = {
  query_generation: {
    name: 'Query Generation',
    icon: 'Sparkles',
    description: 'AI generates diverse search queries',
  },
  web_search: {
    name: 'Web Search',
    icon: 'Globe',
    description: 'Parallel search across multiple engines',
  },
  semantic_filter: {
    name: 'Semantic Filter',
    icon: 'Filter',
    description: 'AI filters relevant results',
  },
  parallel_crawl: {
    name: 'Parallel Crawl',
    icon: 'Download',
    description: 'Concurrent webpage fetching',
  },
  ai_extraction: {
    name: 'AI Extraction',
    icon: 'Brain',
    description: 'Gemini extracts opportunity details',
  },
  db_sync: {
    name: 'Database Sync',
    icon: 'Database',
    description: 'Save to database',
  },
}

// Initial layer state factory
export function createInitialLayerState(id: LayerId): LayerState {
  const config = LAYER_CONFIG[id]
  return {
    id,
    name: config.name,
    status: 'pending',
    expanded: false,
    stats: {},
    items: [],
  }
}

// Initial discovery state factory
export function createInitialDiscoveryState(query: string): DiscoveryState {
  const layers: Record<LayerId, LayerState> = {
    query_generation: createInitialLayerState('query_generation'),
    web_search: createInitialLayerState('web_search'),
    semantic_filter: createInitialLayerState('semantic_filter'),
    parallel_crawl: createInitialLayerState('parallel_crawl'),
    ai_extraction: createInitialLayerState('ai_extraction'),
    db_sync: createInitialLayerState('db_sync'),
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
