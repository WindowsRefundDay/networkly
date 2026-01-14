/**
 * AI Model Management System
 * 
 * A robust, configurable AI model management system with support for
 * multiple AI service providers (OpenRouter, Groq).
 * 
 * @example Basic usage
 * ```typescript
 * import { getAIManager } from '@/lib/ai'
 * 
 * const ai = getAIManager()
 * const result = await ai.complete({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   useCase: 'chat',
 * })
 * console.log(result.content)
 * ```
 * 
 * @example Streaming
 * ```typescript
 * for await (const chunk of ai.stream({ messages, useCase: 'chat' })) {
 *   process.stdout.write(chunk.content)
 * }
 * ```
 * 
 * @example Switch between provider configs
 * ```typescript
 * import { setActiveConfig, getActiveConfig, GROQ_CONFIG, GEMINI_CONFIG } from '@/lib/ai'
 * 
 * // Use Groq (free)
 * setActiveConfig('groq')
 * 
 * // Use Gemini
 * setActiveConfig('gemini')
 * 
 * // Get current config
 * const config = getActiveConfig()
 * console.log(config.displayName) // "Groq (Free)" or "Google Gemini"
 * ```
 */

// Main exports
export { AIModelManager, getAIManager, createAIManager } from './manager'

// Providers
export { OpenRouterProvider, createOpenRouterProvider } from './providers/openrouter'
export { GroqProvider, createGroqProvider } from './providers/groq'
export { GeminiProvider, createGeminiProvider } from './providers/gemini'
export { BaseProvider } from './providers/base'

// Model Configurations (Modular)
export {
  // Configs
  GROQ_CONFIG,
  GEMINI_CONFIG,
  MODEL_CONFIGS,
  GROQ_MODELS,
  GEMINI_MODELS,
  GROQ_USE_CASES,
  GEMINI_USE_CASES,
  // Agent recommendations
  AGENT_MODEL_RECOMMENDATIONS,
  // Helpers
  getActiveConfig,
  setActiveConfig,
  getModelForUseCase,
  getAvailableModels,
  getModelsByQuality,
  getModelsBySpeed,
  getFreeModels,
  // Types
  type ModelConfig,
  type UseCaseModelMapping,
  type ProviderModelConfig,
  type AgentRole,
} from './model-configs'

// Types
export type {
  ProviderName,
  ProviderConfig,
  ModelInfo,
  ModelCapability,
  UseCase,
  Message,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
  ToolDefinition,
  HealthCheckResult,
  ProviderStatus,
  RateLimitState,
  RateLimitConfig,
  AIManagerConfig,
  UseCaseConfig,
  CostRecord,
  CostSummary,
  ModelPricing,
} from './types'

// Errors
export {
  AIProviderError,
  RateLimitError,
  ModelNotFoundError,
  AuthenticationError,
} from './types'

// Schemas for validation
export {
  ProviderConfigSchema,
  UseCaseConfigSchema,
  AIManagerConfigSchema,
} from './types'

// Model Pricing
export { MODEL_PRICING } from './types'

// Utilities
export { logger } from './utils/logger'
export { rateLimiter, RateLimiter } from './utils/rate-limiter'
export { withRetry, circuitBreaker, CircuitBreaker } from './utils/retry'
export { getCostTracker, CostTracker } from './utils/cost-tracker'
