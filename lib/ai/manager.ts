/**
 * AI Model Manager - Central orchestration for multi-provider AI
 * 
 * Features:
 * - Multi-provider support (OpenRouter, Groq)
 * - Use case-based model selection
 * - Automatic fallback handling
 * - Health monitoring
 * - Unified interface for all AI operations
 */

import type {
  ProviderName,
  ProviderConfig,
  ModelInfo,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
  HealthCheckResult,
  ProviderStatus,
  RateLimitState,
  RateLimitConfig,
  AIManagerConfig,
  UseCaseConfig,
  UseCase,
} from './types'

import { AIProviderError, AIManagerConfigSchema } from './types'
import { BaseProvider } from './providers/base'
import { OpenRouterProvider } from './providers/openrouter'
import { GroqProvider } from './providers/groq'
import { logger } from './utils/logger'
import { DEFAULT_USE_CASE_MODELS } from './model-configs'

// Use case to model mapping defaults - Prioritize Groq (FREE)
// Based on benchmarks: GPT-OSS 120B (90% MMLU), Llama 3.3 (86% MMLU)
// Preview models marked with (Preview) suffix may be discontinued without notice
const DEFAULT_USE_CASE_MODELS_INTERNAL: Record<UseCase, { primary: string; fallbacks: string[] }> = {
  'chat': {
    primary: 'openai/gpt-oss-120b',
    fallbacks: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  },
  'analysis': {
    primary: 'moonshotai/kimi-k2-instruct-0905',
    fallbacks: ['qwen/qwen3-32b', 'openai/gpt-oss-120b'],
  },
  'code-generation': {
    primary: 'qwen/qwen3-32b',
    fallbacks: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile'],
  },
  'summarization': {
    primary: 'llama-3.1-8b-instant',
    fallbacks: ['openai/gpt-oss-20b', 'llama-3.3-70b-versatile'],
  },
  'extraction': {
    primary: 'groq/compound',
    fallbacks: ['llama-3.3-70b-versatile', 'qwen/qwen3-32b'],
  },
  'vision': {
    primary: 'llama-3.3-70b-versatile',
    fallbacks: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
  },
  'fast-response': {
    primary: 'llama-3.1-8b-instant',
    fallbacks: ['openai/gpt-oss-20b', 'groq/compound'],
  },
  'high-quality': {
    primary: 'openai/gpt-oss-120b',
    fallbacks: ['moonshotai/kimi-k2-instruct-0905', 'llama-3.3-70b-versatile'],
  },
  'cost-effective': {
    primary: 'llama-3.1-8b-instant',
    fallbacks: ['openai/gpt-oss-20b', 'llama-3.3-70b-versatile'],
  },
}

  export class AIModelManager {
  private providers: Map<ProviderName, BaseProvider> = new Map()
  private useCaseConfigs: Map<UseCase, UseCaseConfig> = new Map()
  private healthCheckInterval?: ReturnType<typeof setInterval>
  private providerStatuses: Map<ProviderName, ProviderStatus> = new Map()
  private initialized: boolean = false

  constructor(config?: AIManagerConfig) {
    if (config) {
      this.initialize(config)
    }
  }

  /**
   * Initialize from environment variables
   */

  /**
   * Initialize the manager with configuration
   */
  initialize(config: AIManagerConfig): void {
    // Validate configuration
    const validatedConfig = AIManagerConfigSchema.parse(config)

    // Configure logging
    logger.configure({
      level: validatedConfig.logLevel,
      enabled: validatedConfig.enableLogging,
    })

    // Initialize providers
    for (const providerConfig of validatedConfig.providers) {
      if (!providerConfig.enabled) continue

      let provider: BaseProvider

      switch (providerConfig.name) {
        case 'openrouter':
          provider = new OpenRouterProvider(providerConfig)
          break
        case 'groq':
          provider = new GroqProvider(providerConfig)
          break
        default:
          logger.warn('AIManager', `Unknown provider: ${providerConfig.name}`)
          continue
      }

      this.providers.set(providerConfig.name, provider)
      this.providerStatuses.set(providerConfig.name, {
        name: providerConfig.name,
        healthy: true,
        lastCheck: new Date(),
        consecutiveFailures: 0,
        averageLatencyMs: 0,
        modelsHealthy: provider.getModels().length,
        modelsUnhealthy: 0,
      })

      logger.info('AIManager', `Initialized provider: ${providerConfig.name}`, {
        models: provider.getModels().length,
      })
    }

    // Configure use cases
    if (validatedConfig.useCases) {
      for (const useCaseConfig of validatedConfig.useCases) {
        this.useCaseConfigs.set(useCaseConfig.useCase, useCaseConfig)
      }
    }

    // Start health checks if enabled
    if (validatedConfig.enableHealthChecks) {
      this.startHealthChecks(validatedConfig.healthCheckIntervalMs)
    }

    this.initialized = true
    logger.info('AIManager', 'Initialization complete', {
      providers: this.providers.size,
      useCases: this.useCaseConfigs.size,
    })
  }

  /**
   * Initialize from environment variables
   */
  initializeFromEnv(): void {
    const providers: AIManagerConfig['providers'] = []

    // OpenRouter
    const openrouterKey = process.env.OPENROUTER_API_KEY
    if (openrouterKey) {
      providers.push({
        name: 'openrouter',
        apiKey: openrouterKey,
        baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
        defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o',
        enabled: true,
        timeout: parseInt(process.env.AI_TIMEOUT || '30000', 10),
        maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3', 10),
      })
    }

    // Groq
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      providers.push({
        name: 'groq',
        apiKey: groqKey,
        baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1/chat/completions',
        defaultModel: process.env.GROQ_DEFAULT_MODEL || 'llama-3.3-70b-versatile',
        enabled: true,
        timeout: parseInt(process.env.AI_TIMEOUT || '30000', 10),
        maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3', 10),
      })
    }

    if (providers.length === 0) {
      throw new Error('No AI providers configured. Set OPENROUTER_API_KEY or GROQ_API_KEY.')
    }

    this.initialize({
      providers,
      globalTimeout: parseInt(process.env.AI_TIMEOUT || '30000', 10),
      globalMaxRetries: parseInt(process.env.AI_MAX_RETRIES || '3', 10),
      enableHealthChecks: process.env.AI_HEALTH_CHECKS !== 'false',
      healthCheckIntervalMs: parseInt(process.env.AI_HEALTH_CHECK_INTERVAL || '60000', 10),
      enableLogging: process.env.AI_LOGGING !== 'false',
      logLevel: (process.env.AI_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    })
  }

  /**
   * Get all available models across all providers
   */
  getAllModels(): ModelInfo[] {
    const models: ModelInfo[] = []
    for (const provider of this.providers.values()) {
      models.push(...provider.getModels())
    }
    return models
  }

  /**
   * Get models from a specific provider
   */
  getProviderModels(providerName: ProviderName): ModelInfo[] {
    const provider = this.providers.get(providerName)
    return provider ? provider.getModels() : []
  }

  /**
   * Get a specific model by full ID (provider:model)
   */
  getModel(fullModelId: string): ModelInfo | undefined {
    const [providerName, modelId] = this.parseModelId(fullModelId)
    const provider = this.providers.get(providerName)
    return provider?.getModel(modelId)
  }

  /**
   * Parse a full model ID into provider and model parts
   */
  private parseModelId(fullModelId: string): [ProviderName, string] {
    const colonIndex = fullModelId.indexOf(':')
    if (colonIndex === -1) {
      // Default to groq for backward compatibility
      return ['groq', fullModelId]
    }
    return [
      fullModelId.substring(0, colonIndex) as ProviderName,
      fullModelId.substring(colonIndex + 1),
    ]
  }

  /**
   * Complete a chat with automatic fallback
   */
  async complete(options: CompletionOptions & { useCase?: UseCase }): Promise<CompletionResult> {
    const modelsToTry = this.getModelsForRequest(options)

    let lastError: Error | undefined

    for (const fullModelId of modelsToTry) {
      const [providerName, modelId] = this.parseModelId(fullModelId)
      const provider = this.providers.get(providerName)

      if (!provider) {
        logger.warn('AIManager', `Provider not found: ${providerName}`)
        continue
      }

      // Check provider health
      const status = this.providerStatuses.get(providerName)
      if (status && status.consecutiveFailures >= 5) {
        logger.warn('AIManager', `Skipping unhealthy provider: ${providerName}`)
        continue
      }

      try {
        const result = await provider.complete({
          ...options,
          model: modelId,
        })

        // Update provider status on success
        if (status) {
          status.consecutiveFailures = 0
          status.healthy = true
        }

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Update provider status on failure
        if (status) {
          status.consecutiveFailures++
          if (status.consecutiveFailures >= 3) {
            status.healthy = false
          }
        }

        // Log and try next model
        const nextModel = modelsToTry[modelsToTry.indexOf(fullModelId) + 1]
        if (nextModel) {
          logger.fallback(fullModelId, nextModel, lastError.message)
        }
      }
    }

    throw lastError || new Error('All models failed')
  }

  /**
   * Stream a chat completion with automatic fallback
   */
  async *stream(
    options: CompletionOptions & { useCase?: UseCase }
  ): AsyncGenerator<StreamChunk> {
    const modelsToTry = this.getModelsForRequest(options)

    let lastError: Error | undefined

    for (const fullModelId of modelsToTry) {
      const [providerName, modelId] = this.parseModelId(fullModelId)
      const provider = this.providers.get(providerName)

      if (!provider) continue

      const status = this.providerStatuses.get(providerName)
      if (status && status.consecutiveFailures >= 5) continue

      try {
        for await (const chunk of provider.stream({
          ...options,
          model: modelId,
        })) {
          yield chunk
        }

        // Update provider status on success
        if (status) {
          status.consecutiveFailures = 0
          status.healthy = true
        }

        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (status) {
          status.consecutiveFailures++
          if (status.consecutiveFailures >= 3) {
            status.healthy = false
          }
        }

        const nextModel = modelsToTry[modelsToTry.indexOf(fullModelId) + 1]
        if (nextModel) {
          logger.fallback(fullModelId, nextModel, lastError.message)
        }
      }
    }

    throw lastError || new Error('All models failed')
  }

  /**
   * Get ordered list of models to try for a request
   * Uses DEFAULT_USE_CASE_MODELS with optimal Groq models based on benchmarks
   */
  private getModelsForRequest(options: CompletionOptions & { useCase?: UseCase }): string[] {
    // If specific model requested, use it with fallbacks
    if (options.model) {
      // If it's a full model ID, use it directly
      if (options.model.includes(':')) {
        return [options.model]
      }

      // Otherwise, assume it's a short model ID and try to find it
      for (const [pName, provider] of this.providers) {
        if (provider.hasModel(options.model)) {
          return [`${pName}:${options.model}`]
        }
      }
    }

    // Get models based on use case
    const useCase = options.useCase || 'chat'
    const useCaseConfig = DEFAULT_USE_CASE_MODELS[useCase] || DEFAULT_USE_CASE_MODELS.chat

    return [useCaseConfig.primary, ...useCaseConfig.fallbacks]
  }

  /**
   * Configure a use case with specific models
   */
  configureUseCase(config: UseCaseConfig): void {
    this.useCaseConfigs.set(config.useCase, config)
    logger.info('AIManager', `Configured use case: ${config.useCase}`, {
      primary: config.primaryModel,
      fallbacks: config.fallbackModels.length,
    })
  }

  /**
   * Start health check monitoring
   */
  private startHealthChecks(intervalMs: number): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.runHealthChecks()
    }, intervalMs)

    // Run initial check
    this.runHealthChecks().catch((err) => {
      logger.error('AIManager', 'Initial health check failed', { error: String(err) })
    })
  }

  /**
   * Run health checks on all providers
   */
  async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = []

    for (const [name, provider] of this.providers) {
      try {
        const result = await provider.healthCheck()
        results.push(result)

        const status = this.providerStatuses.get(name)
        if (status) {
          status.healthy = result.healthy
          status.lastCheck = result.timestamp
          status.averageLatencyMs = (status.averageLatencyMs + result.latencyMs) / 2

          if (result.healthy) {
            status.consecutiveFailures = 0
          } else {
            status.consecutiveFailures++
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          provider: name,
          model: 'default',
          healthy: false,
          latencyMs: 0,
          error: errorMessage,
          timestamp: new Date(),
        })

        const status = this.providerStatuses.get(name)
        if (status) {
          status.healthy = false
          status.consecutiveFailures++
        }
      }
    }

    return results
  }

  /**
   * Get provider statuses
   */
  getProviderStatuses(): ProviderStatus[] {
    return Array.from(this.providerStatuses.values())
  }

  /**
   * Get a specific provider status
   */
  getProviderStatus(providerName: ProviderName): ProviderStatus | undefined {
    return this.providerStatuses.get(providerName)
  }

  /**
   * Check if a provider is healthy
   */
  isProviderHealthy(providerName: ProviderName): boolean {
    const status = this.providerStatuses.get(providerName)
    return status?.healthy ?? false
  }

  /**
   * Get healthy providers
   */
  getHealthyProviders(): ProviderName[] {
    return Array.from(this.providerStatuses.entries())
      .filter(([_, status]) => status.healthy)
      .map(([name]) => name)
  }

  /**
   * Stop health checks and cleanup
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    // Cancel any ongoing requests
    for (const provider of this.providers.values()) {
      provider.cancel()
    }

    logger.info('AIManager', 'Shutdown complete')
  }

  /**
   * Check if manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }
}

// Singleton instance
let managerInstance: AIModelManager | null = null

/**
 * Get or create the singleton AI Manager instance
 */
export function getAIManager(): AIModelManager {
  if (!managerInstance) {
    managerInstance = new AIModelManager()
    managerInstance.initializeFromEnv()
  }
  return managerInstance
}

/**
 * Create a new AI Manager instance with custom config
 */
export function createAIManager(config: AIManagerConfig): AIModelManager {
  return new AIModelManager(config)
}

// Re-export providers for direct use if needed
export { OpenRouterProvider, GroqProvider }
