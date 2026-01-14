/**
 * Base AI Provider - Abstract class for all AI providers
 */

import type {
  ProviderName,
  ProviderConfig,
  ModelInfo,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
  HealthCheckResult,
} from '../types'
import { AIProviderError, AuthenticationError } from '../types'
import { logger } from '../utils/logger'
import { rateLimiter } from '../utils/rate-limiter'
import { withRetry, circuitBreaker } from '../utils/retry'
import { getCostTracker } from '../utils/cost-tracker'

export abstract class BaseProvider {
  protected config: ProviderConfig
  protected models: Map<string, ModelInfo> = new Map()
  protected abortControllers: Map<string, AbortController> = new Map()

  constructor(config: ProviderConfig) {
    this.config = config
    this.initializeModels()

    // Configure rate limiter if limits are specified
    if (config.rateLimitRpm || config.rateLimitTpm) {
      rateLimiter.configure(config.name, {
        requestsPerMinute: config.rateLimitRpm || 1000,
        tokensPerMinute: config.rateLimitTpm || 100000,
      })
    }
  }

  abstract get providerName(): ProviderName
  protected abstract initializeModels(): void
  protected abstract parseResponse(response: unknown): CompletionResult
  protected abstract parseStreamChunk(chunk: unknown): StreamChunk | null

  // Get all available models
  getModels(): ModelInfo[] {
    return Array.from(this.models.values())
  }

  // Get a specific model
  getModel(modelId: string): ModelInfo | undefined {
    return this.models.get(modelId)
  }

  // Check if model exists
  hasModel(modelId: string): boolean {
    return this.models.has(modelId)
  }

  // Get default model
  getDefaultModel(): ModelInfo | undefined {
    return this.models.get(this.config.defaultModel)
  }

  // Build request headers
  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.config.headers,
    }
  }

  // Build request body
  protected abstract buildRequestBody(options: CompletionOptions): Record<string, unknown>

  // Execute completion request
  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const model = options.model || this.config.defaultModel

    // Check circuit breaker
    if (circuitBreaker.isOpen(this.providerName, model)) {
      throw new AIProviderError(
        `Circuit breaker open for ${this.providerName}/${model}`,
        this.providerName,
        503,
        true
      )
    }

    // Check rate limits
    const estimatedTokens = this.estimateTokens(options)
    await rateLimiter.checkAndConsume(this.providerName, estimatedTokens)

    const startTime = Date.now()
    logger.request(this.providerName, model, { 
      messageCount: options.messages.length,
      temperature: options.temperature 
    })

    try {
      const result = await withRetry(
        this.providerName,
        async () => {
          const controller = new AbortController()
          const requestId = `${Date.now()}-${Math.random()}`
          this.abortControllers.set(requestId, controller)

          const timeoutId = setTimeout(() => {
            controller.abort()
          }, this.config.timeout || 30000)

          try {
            const response = await fetch(this.config.baseUrl, {
              method: 'POST',
              headers: this.getHeaders(),
              body: JSON.stringify(this.buildRequestBody({ ...options, model })),
              signal: controller.signal,
            })

            if (!response.ok) {
              await this.handleErrorResponse(response)
            }

            const data = await response.json()
            return this.parseResponse(data)
          } finally {
            clearTimeout(timeoutId)
            this.abortControllers.delete(requestId)
          }
        },
        { maxRetries: this.config.maxRetries }
      )

      const latencyMs = Date.now() - startTime
      result.latencyMs = latencyMs

      // Record success and token usage
      circuitBreaker.recordSuccess(this.providerName, model)
      rateLimiter.recordTokenUsage(this.providerName, result.usage.totalTokens)

      // Record cost
      const costTracker = getCostTracker()
      costTracker.recordCost({
        provider: this.providerName,
        model,
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        latencyMs,
      }).catch(err => {
        logger.warn('BaseProvider', 'Failed to record cost', { error: String(err) })
      })

      logger.response(this.providerName, model, latencyMs, {
        tokens: result.usage.totalTokens,
        finishReason: result.finishReason,
      })

      return result
    } catch (error) {
      circuitBreaker.recordFailure(this.providerName, model)
      throw error
    }
  }

  // Stream completion
  async *stream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    const model = options.model || this.config.defaultModel

    if (circuitBreaker.isOpen(this.providerName, model)) {
      throw new AIProviderError(
        `Circuit breaker open for ${this.providerName}/${model}`,
        this.providerName,
        503,
        true
      )
    }

    const estimatedTokens = this.estimateTokens(options)
    await rateLimiter.checkAndConsume(this.providerName, estimatedTokens)

    const startTime = Date.now()
    logger.request(this.providerName, model, { streaming: true })

    const controller = new AbortController()
    const requestId = `stream-${Date.now()}`
    this.abortControllers.set(requestId, controller)

    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(this.buildRequestBody({ ...options, model, stream: true })),
        signal: controller.signal,
      })

      if (!response.ok) {
        await this.handleErrorResponse(response)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new AIProviderError('No response body', this.providerName)
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let isFirst = true
      let totalTokens = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const chunk = this.parseStreamChunk(parsed)
              if (chunk) {
                chunk.isFirst = isFirst
                isFirst = false
                totalTokens++
                yield chunk
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      // Record success
      circuitBreaker.recordSuccess(this.providerName, model)
      rateLimiter.recordTokenUsage(this.providerName, totalTokens)

      const latencyMs = Date.now() - startTime

      // Record cost (estimate input tokens from request)
      const estimatedInputTokens = this.estimateTokens(options) - (options.maxTokens || 500)
      const costTracker = getCostTracker()
      costTracker.recordCost({
        provider: this.providerName,
        model,
        inputTokens: Math.max(estimatedInputTokens, 0),
        outputTokens: totalTokens,
        latencyMs,
      }).catch(err => {
        logger.warn('BaseProvider', 'Failed to record stream cost', { error: String(err) })
      })

      logger.response(this.providerName, model, latencyMs, { streaming: true, tokens: totalTokens })
    } catch (error) {
      circuitBreaker.recordFailure(this.providerName, model)
      throw error
    } finally {
      this.abortControllers.delete(requestId)
    }
  }

  // Cancel ongoing request
  cancel(requestId?: string) {
    if (requestId) {
      const controller = this.abortControllers.get(requestId)
      if (controller) {
        controller.abort()
        this.abortControllers.delete(requestId)
      }
    } else {
      // Cancel all
      for (const [id, controller] of this.abortControllers) {
        controller.abort()
        this.abortControllers.delete(id)
      }
    }
  }

  // Health check
  async healthCheck(model?: string): Promise<HealthCheckResult> {
    const testModel = model || this.config.defaultModel
    const startTime = Date.now()

    try {
      await this.complete({
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5,
        temperature: 0,
      })

      const latencyMs = Date.now() - startTime
      logger.healthCheck(this.providerName, true, latencyMs)

      return {
        provider: this.providerName,
        model: testModel,
        healthy: true,
        latencyMs,
        timestamp: new Date(),
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.healthCheck(this.providerName, false, latencyMs)

      return {
        provider: this.providerName,
        model: testModel,
        healthy: false,
        latencyMs,
        error: errorMessage,
        timestamp: new Date(),
      }
    }
  }

  // Handle error responses
  protected async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}`
    
    try {
      const errorData = await response.json()
      errorMessage = errorData.error?.message || errorData.message || errorMessage
    } catch {
      // Use status text if JSON parsing fails
      errorMessage = response.statusText || errorMessage
    }

    switch (response.status) {
      case 401:
        throw new AuthenticationError(this.providerName)
      case 429:
        const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10)
        throw new AIProviderError(errorMessage, this.providerName, 429, true, retryAfter)
      case 500:
      case 502:
      case 503:
      case 504:
        throw new AIProviderError(errorMessage, this.providerName, response.status, true)
      default:
        throw new AIProviderError(errorMessage, this.providerName, response.status, false)
    }
  }

  // Estimate token count for rate limiting
  protected estimateTokens(options: CompletionOptions): number {
    let estimate = 0
    for (const message of options.messages) {
      // Rough estimate: 4 characters per token
      estimate += Math.ceil(message.content.length / 4)
    }
    // Add expected output tokens
    estimate += options.maxTokens || 500
    return estimate
  }
}
