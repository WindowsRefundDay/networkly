/**
 * AI Integration Types
 * 
 * Simplified for strict Gemini/Vertex AI support.
 */

// ============================================================================
// Core Types
// ============================================================================

export interface CompletionResult {
  content: string
  toolCalls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

export interface StreamChunk {
  type: 'text-delta' | 'tool-call' | 'tool-result' | 'error' | 'finish'
  textDelta?: string
  toolName?: string
  toolCallId?: string
  args?: any // Object for AI SDK
  result?: any
}

// ============================================================================
// Pricing
// ============================================================================

export interface ModelPricing {
  inputPer1kTokens: number
  outputPer1kTokens: number
}

// Only tracking pricing for the model we actually use
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gemini-2.5-flash': { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006 },
}
