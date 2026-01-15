/**
 * AI Model Management System - Type Definitions
 * Comprehensive types for multi-provider AI model management
 */

import { z } from 'zod'

// ============================================================================
// Provider Types
// ============================================================================

export type ProviderName = 'openrouter' | 'groq' | 'gemini'

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
  name: z.enum(['openrouter', 'groq', 'gemini']),
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

// ============================================================================
// Cost Tracking Types
// ============================================================================

export interface CostRecord {
  id: string
  timestamp: string
  provider: ProviderName
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
  latencyMs: number
  useCase?: UseCase
  cached?: boolean
}

export interface CostSummary {
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
  byProvider: Record<ProviderName, {
    cost: number
    inputTokens: number
    outputTokens: number
    requests: number
  }>
  byModel: Record<string, {
    cost: number
    inputTokens: number
    outputTokens: number
    requests: number
  }>
}

export interface ModelPricing {
  inputPer1kTokens: number
  outputPer1kTokens: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Groq models (FREE)
  'llama-3.3-70b-versatile': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'llama-3.1-8b-instant': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'meta-llama/llama-4-scout-17b-16e-instruct': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'meta-llama/llama-4-maverick-17b-128e-instruct': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'qwen/qwen3-32b': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'openai/gpt-oss-20b': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'openai/gpt-oss-120b': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'moonshotai/kimi-k2-instruct': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'moonshotai/kimi-k2-instruct-0905': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'groq/compound': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'groq/compound-mini': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'meta-llama/llama-guard-4-12b': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'openai/gpt-oss-safeguard-20b': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'meta-llama/llama-prompt-guard-2-86m': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'meta-llama/llama-prompt-guard-2-22m': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'whisper-large-v3': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'whisper-large-v3-turbo': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'allam-2-7b': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'deepseek-r1-distill-llama-70b': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'deepseek-r1-distill-qwen-32b': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'distil-whisper-large-v3-en': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'playai-tts': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'playai-tts-arabic': { inputPer1kTokens: 0, outputPer1kTokens: 0 },

  // Gemini models (Google pricing as of January 2025)
  // Prices in USD per 1K tokens
  // Gemini 2.5 (Latest)
  'gemini-2.5-pro-preview-06-05': { inputPer1kTokens: 0.00125, outputPer1kTokens: 0.01 },
  'gemini-2.5-flash-preview-05-20': { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006 },
  'gemini-2.5-flash-lite-preview-06-17': { inputPer1kTokens: 0.000075, outputPer1kTokens: 0.0003 },
  // Gemini 2.0
  'gemini-2.0-flash': { inputPer1kTokens: 0.0001, outputPer1kTokens: 0.0004 },
  'gemini-2.0-flash-lite': { inputPer1kTokens: 0.000075, outputPer1kTokens: 0.0003 },
  // Gemini 1.5 (Legacy)
  'gemini-1.5-pro': { inputPer1kTokens: 0.00125, outputPer1kTokens: 0.005 },
  'gemini-1.5-flash': { inputPer1kTokens: 0.000075, outputPer1kTokens: 0.0003 },
  'gemini-1.5-flash-8b': { inputPer1kTokens: 0.0000375, outputPer1kTokens: 0.00015 },

  // OpenRouter models (various pricing)
  'openai/gpt-4o': { inputPer1kTokens: 0.005, outputPer1kTokens: 0.015 },
  'openai/gpt-4o-mini': { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006 },
  'openai/gpt-4-turbo': { inputPer1kTokens: 0.01, outputPer1kTokens: 0.03 },
  'openai/o1-preview': { inputPer1kTokens: 0.015, outputPer1kTokens: 0.06 },
  'openai/o1-mini': { inputPer1kTokens: 0.003, outputPer1kTokens: 0.012 },
  'anthropic/claude-3.5-sonnet': { inputPer1kTokens: 0.003, outputPer1kTokens: 0.015 },
  'anthropic/claude-3-opus': { inputPer1kTokens: 0.015, outputPer1kTokens: 0.075 },
  'anthropic/claude-3-haiku': { inputPer1kTokens: 0.00025, outputPer1kTokens: 0.00125 },
  'google/gemini-2.0-flash-exp:free': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'google/gemini-pro-1.5': { inputPer1kTokens: 0.00125, outputPer1kTokens: 0.005 },
  'google/gemini-flash-1.5': { inputPer1kTokens: 0.000075, outputPer1kTokens: 0.0003 },
  'meta-llama/llama-3.3-70b-instruct': { inputPer1kTokens: 0.00035, outputPer1kTokens: 0.0004 },
  'meta-llama/llama-3.1-405b-instruct': { inputPer1kTokens: 0.002, outputPer1kTokens: 0.002 },
  'meta-llama/llama-3.1-8b-instruct:free': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'mistralai/mistral-large': { inputPer1kTokens: 0.002, outputPer1kTokens: 0.006 },
  'mistralai/mixtral-8x7b-instruct': { inputPer1kTokens: 0.00024, outputPer1kTokens: 0.00024 },
  'mistralai/mistral-7b-instruct:free': { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  'deepseek/deepseek-chat': { inputPer1kTokens: 0.00014, outputPer1kTokens: 0.00028 },
  'deepseek/deepseek-r1': { inputPer1kTokens: 0.00055, outputPer1kTokens: 0.00219 },
  'qwen/qwen-2.5-72b-instruct': { inputPer1kTokens: 0.00035, outputPer1kTokens: 0.0004 },
  'qwen/qwen-2.5-coder-32b-instruct': { inputPer1kTokens: 0.00018, outputPer1kTokens: 0.00018 },
  'cohere/command-r-plus': { inputPer1kTokens: 0.003, outputPer1kTokens: 0.015 },
  'perplexity/llama-3.1-sonar-large-128k-online': { inputPer1kTokens: 0.001, outputPer1kTokens: 0.001 },
}
