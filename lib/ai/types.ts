/**
 * AI Integration Types
 * 
 * Support for Gemini/Vertex AI and legacy types.
 */

// ============================================================================
// Core Types
// ============================================================================

export type ProviderName = 'gemini' | 'openrouter' | 'anthropic' | 'openai';

export interface CompletionResult {
  id?: string
  provider?: ProviderName
  model?: string
  content: string
  finishReason?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  toolCalls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
  latencyMs?: number
}

export interface StreamChunk {
  id?: string
  content: string
  isFirst?: boolean
  isLast?: boolean
  type?: 'text-delta' | 'tool-call' | 'tool-result' | 'error' | 'finish'
  textDelta?: string
  toolName?: string
  toolCallId?: string
  args?: any // Object for AI SDK
  result?: any
  toolCalls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
  finishReason?: string
}

export class AIProviderError extends Error {
  constructor(message: string, public provider: string, public statusCode: number = 500, public retryable: boolean = false) {
    super(message)
    this.name = 'AIProviderError'
  }
}

export class AuthenticationError extends AIProviderError {
  constructor(provider: string) {
    super('Authentication failed', provider, 401, false)
    this.name = 'AuthenticationError'
  }
}

export class RateLimitError extends AIProviderError {
  constructor(provider: string, public retryAfter?: number) {
    super('Rate limit exceeded', provider, 429, true)
    this.name = 'RateLimitError'
  }
}

// ============================================================================
// Configuration
// ============================================================================

export interface VertexConfig {
  project: string
  location: string
  credentials?: {
    client_email: string
    private_key: string
  }
}

export interface ProviderConfig {
  name: ProviderName
  apiKey: string
  baseUrl?: string
  defaultModel: string
  enabled: boolean
  timeout: number
  maxRetries: number
  useVertexAI?: boolean
  vertexConfig?: VertexConfig
}

export interface ModelInfo {
  id: string
  provider: ProviderName
  name: string
  contextLength: number
  maxOutputTokens: number
  capabilities: string[]
  costPer1kInputTokens: number
  costPer1kOutputTokens: number
  supportsStreaming: boolean
  supportsVision: boolean
  supportsFunctionCalling: boolean
  tier: string
}

export interface ToolDefinition {
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface CompletionOptions {
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'function' | 'tool'
    content: string
    toolCalls?: any[]
    toolCallId?: string
    name?: string
  }>
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stop?: string[]
  tools?: ToolDefinition[]
  toolChoice?: any
  useCase?: string // For examples.ts
  responseFormat?: any // For examples.ts
}

export interface HealthCheckResult {
  provider: ProviderName
  model: string
  healthy: boolean
  latencyMs: number
  error?: string
  timestamp: Date
}

// ============================================================================
// Pricing
// ============================================================================

export interface ModelPricing {
  inputPer1kTokens: number
  outputPer1kTokens: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gemini-2.5-flash': { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006 },
}

// ============================================================================
// Legacy / Example Support
// ============================================================================
export interface UseCase {
  useCase: string
  primaryModel: string
  fallbackModels: string[]
  defaultTemperature: number
  maxTokens?: number
  systemPrompt?: string
}

export type Message = CompletionOptions['messages'][0]
