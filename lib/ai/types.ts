/**
 * AI Model Management System - Type Definitions
 * Comprehensive types for multi-provider AI model management
 */

import { z } from 'zod'

// ============================================================================
// Provider Types
// ============================================================================

export type ProviderName = 'openrouter' | 'groq'

export type ModelCapability = 
  | 'chat'
  | 'completion'
  | 'vision'
  | 'function-calling'
  | 'json-mode'
  | 'streaming'

export type UseCase =
  | 'chat'
  | 'analysis'
  | 'code-generation'
  | 'summarization'
  | 'extraction'
  | 'vision'
  | 'fast-response'
  | 'high-quality'
  | 'cost-effective'

// ============================================================================
// Model Configuration
// ============================================================================

export interface ModelInfo {
  id: string
  name: string
  provider: ProviderName
  contextLength: number
  maxOutputTokens?: number
  capabilities: ModelCapability[]
  costPer1kInputTokens?: number
  costPer1kOutputTokens?: number
  supportsStreaming: boolean
  supportsVision: boolean
  supportsFunctionCalling: boolean
  tier: 'free' | 'standard' | 'premium'
}

export interface ProviderConfig {
  name: ProviderName
  apiKey: string
  baseUrl: string
  defaultModel: string
  enabled: boolean
  rateLimitRpm?: number
  rateLimitTpm?: number
  timeout?: number
  maxRetries?: number
  headers?: Record<string, string>
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string
  name?: string
  functionCall?: {
    name: string
    arguments: string
  }
}

export interface CompletionOptions {
  model?: string
  messages: Message[]
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string[]
  stream?: boolean
  responseFormat?: { type: 'text' | 'json_object' }
  tools?: ToolDefinition[]
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface CompletionResult {
  id: string
  provider: ProviderName
  model: string
  content: string
  finishReason: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter'
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  functionCall?: {
    name: string
    arguments: string
  }
  toolCalls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
  latencyMs: number
  cached?: boolean
}

export interface StreamChunk {
  id: string
  content: string
  finishReason?: 'stop' | 'length' | 'function_call' | 'tool_calls'
  isFirst?: boolean
  isLast?: boolean
}

// ============================================================================
// Health & Monitoring
// ============================================================================

export interface HealthCheckResult {
  provider: ProviderName
  model: string
  healthy: boolean
  latencyMs: number
  error?: string
  timestamp: Date
}

export interface ProviderStatus {
  name: ProviderName
  healthy: boolean
  lastCheck: Date
  consecutiveFailures: number
  averageLatencyMs: number
  modelsHealthy: number
  modelsUnhealthy: number
}

// ============================================================================
// Rate Limiting
// ============================================================================

export interface RateLimitState {
  requestsRemaining: number
  tokensRemaining: number
  resetTime: Date
  retryAfter?: number
}

export interface RateLimitConfig {
  requestsPerMinute: number
  tokensPerMinute: number
  burstLimit?: number
}

// ============================================================================
// Error Types
// ============================================================================

export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: ProviderName,
    public statusCode?: number,
    public retryable: boolean = false,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}

export class RateLimitError extends AIProviderError {
  constructor(provider: ProviderName, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 429, true, retryAfter)
    this.name = 'RateLimitError'
  }
}

export class ModelNotFoundError extends AIProviderError {
  constructor(provider: ProviderName, model: string) {
    super(`Model ${model} not found for provider ${provider}`, provider, 404, false)
    this.name = 'ModelNotFoundError'
  }
}

export class AuthenticationError extends AIProviderError {
  constructor(provider: ProviderName) {
    super(`Authentication failed for ${provider}`, provider, 401, false)
    this.name = 'AuthenticationError'
  }
}

// ============================================================================
// Configuration Schemas (Zod)
// ============================================================================

export const ProviderConfigSchema = z.object({
  name: z.enum(['openrouter', 'groq']),
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().url(),
  defaultModel: z.string(),
  enabled: z.boolean().default(true),
  rateLimitRpm: z.number().positive().optional(),
  rateLimitTpm: z.number().positive().optional(),
  timeout: z.number().positive().default(30000),
  maxRetries: z.number().min(0).max(10).default(3),
  headers: z.record(z.string()).optional(),
})

export const UseCaseConfigSchema = z.object({
  useCase: z.enum([
    'chat',
    'analysis',
    'code-generation',
    'summarization',
    'extraction',
    'vision',
    'fast-response',
    'high-quality',
    'cost-effective',
  ]),
  primaryModel: z.string(),
  fallbackModels: z.array(z.string()).default([]),
  systemPrompt: z.string().optional(),
  defaultTemperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().optional(),
})

export const AIManagerConfigSchema = z.object({
  providers: z.array(ProviderConfigSchema),
  useCases: z.array(UseCaseConfigSchema).optional(),
  globalTimeout: z.number().positive().default(30000),
  globalMaxRetries: z.number().min(0).max(10).default(3),
  enableHealthChecks: z.boolean().default(true),
  healthCheckIntervalMs: z.number().positive().default(60000),
  enableLogging: z.boolean().default(true),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export type AIManagerConfig = z.infer<typeof AIManagerConfigSchema>
export type UseCaseConfig = z.infer<typeof UseCaseConfigSchema>
