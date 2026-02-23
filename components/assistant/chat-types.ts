import type { InlineOpportunity } from './opportunity-card-inline'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  opportunities?: InlineOpportunity[]
  opportunityCache?: Record<string, InlineOpportunity>
  isStreaming?: boolean
  toolStatus?: string
  discoveryPrompt?: { query: string }
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface StreamEvent {
  type: 'text-delta' | 'tool-status' | 'opportunities' | 'trigger_discovery' | 'error'
  textDelta?: string
  status?: string
  opportunities?: InlineOpportunity[]
  query?: string
  error?: string
}
