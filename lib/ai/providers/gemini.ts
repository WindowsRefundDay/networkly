/**
 * Gemini Provider - Direct Google Generative AI integration
 * 
 * Uses the @google/generative-ai SDK for direct access to Gemini models.
 * Supports all Gemini models including 2.0 Flash, 1.5 Pro, 1.5 Flash, etc.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
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
import { getCostTracker } from '../utils/cost-tracker'

// Gemini model definitions with pricing
const GEMINI_MODELS: Record<string, Omit<ModelInfo, 'id' | 'provider'>> = {
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    contextLength: 1048576,
    maxOutputTokens: 8192,
    capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
    costPer1kInputTokens: 0.0001,
    costPer1kOutputTokens: 0.0004,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    tier: 'standard',
  },
  'gemini-2.0-flash-lite': {
    name: 'Gemini 2.0 Flash Lite',
    contextLength: 1048576,
    maxOutputTokens: 8192,
    capabilities: ['chat', 'streaming'],
    costPer1kInputTokens: 0.000075,
    costPer1kOutputTokens: 0.0003,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctionCalling: false,
    tier: 'free',
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    contextLength: 2097152,
    maxOutputTokens: 8192,
    capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.005,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    tier: 'premium',
  },
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    contextLength: 1048576,
    maxOutputTokens: 8192,
    capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
    costPer1kInputTokens: 0.000075,
    costPer1kOutputTokens: 0.0003,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    tier: 'standard',
  },
  'gemini-1.5-flash-8b': {
    name: 'Gemini 1.5 Flash 8B',
    contextLength: 1048576,
    maxOutputTokens: 8192,
    capabilities: ['chat', 'streaming'],
    costPer1kInputTokens: 0.0000375,
    costPer1kOutputTokens: 0.00015,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctionCalling: false,
    tier: 'free',
  },
  'gemini-pro': {
    name: 'Gemini Pro',
    contextLength: 32768,
    maxOutputTokens: 8192,
    capabilities: ['chat', 'function-calling', 'streaming'],
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctionCalling: true,
    tier: 'standard',
  },
}

const DEFAULT_MODEL = 'gemini-2.0-flash'

export class GeminiProvider {
  private client: GoogleGenerativeAI
  private config: ProviderConfig
  private models: Map<string, ModelInfo> = new Map()

  constructor(config: Partial<ProviderConfig> & { apiKey: string }) {
    const { apiKey, ...restConfig } = config
    this.config = {
      name: 'gemini',
      apiKey,
      baseUrl: 'https://generativelanguage.googleapis.com',
      defaultModel: restConfig.defaultModel || DEFAULT_MODEL,
      enabled: restConfig.enabled ?? true,
      timeout: restConfig.timeout ?? 60000,
      maxRetries: restConfig.maxRetries ?? 3,
      ...restConfig,
    }

    this.client = new GoogleGenerativeAI(apiKey)
    this.initializeModels()
  }

  get providerName(): ProviderName {
    return 'gemini'
  }

  private initializeModels(): void {
    for (const [id, modelDef] of Object.entries(GEMINI_MODELS)) {
      this.models.set(id, {
        id,
        provider: 'gemini',
        ...modelDef,
      })
    }
  }

  getModels(): ModelInfo[] {
    return Array.from(this.models.values())
  }

  getModel(modelId: string): ModelInfo | undefined {
    return this.models.get(modelId)
  }

  hasModel(modelId: string): boolean {
    return this.models.has(modelId)
  }

  getDefaultModel(): ModelInfo | undefined {
    return this.models.get(this.config.defaultModel)
  }

  /**
   * Complete a chat request
   */
  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const modelId = options.model || this.config.defaultModel
    const startTime = Date.now()

    logger.request('gemini', modelId, {
      messageCount: options.messages.length,
      temperature: options.temperature,
    })

    try {
      const model = this.client.getGenerativeModel({
        model: modelId,
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          topP: options.topP,
          stopSequences: options.stop,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      })

      // Convert messages to Gemini format
      const contents = this.convertMessages(options.messages)

      const result = await model.generateContent({
        contents,
      })

      const response = result.response
      const text = response.text()
      const latencyMs = Date.now() - startTime

      // Extract usage metadata
      const usageMetadata = response.usageMetadata
      const promptTokens = usageMetadata?.promptTokenCount || this.estimateTokens(options.messages)
      const completionTokens = usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4)
      const totalTokens = promptTokens + completionTokens

      // Record cost
      const costTracker = getCostTracker()
      await costTracker.recordCost({
        provider: 'gemini',
        model: modelId,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        latencyMs,
      })

      logger.response('gemini', modelId, latencyMs, {
        tokens: totalTokens,
        finishReason: 'stop',
      })

      return {
        id: `gemini-${Date.now()}`,
        provider: 'gemini',
        model: modelId,
        content: text,
        finishReason: 'stop',
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        latencyMs,
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime
      logger.error('GeminiProvider', 'Completion failed', {
        model: modelId,
        error: String(error),
        latencyMs,
      })

      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new AuthenticationError('gemini')
        }
        throw new AIProviderError(error.message, 'gemini', 500, true)
      }
      throw error
    }
  }

  /**
   * Stream a chat completion
   */
  async *stream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    const modelId = options.model || this.config.defaultModel
    const startTime = Date.now()

    logger.request('gemini', modelId, { streaming: true })

    try {
      const model = this.client.getGenerativeModel({
        model: modelId,
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          topP: options.topP,
          stopSequences: options.stop,
        },
      })

      const contents = this.convertMessages(options.messages)

      const result = await model.generateContentStream({
        contents,
      })

      let isFirst = true
      let totalContent = ''
      let promptTokens = this.estimateTokens(options.messages)

      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          totalContent += text
          yield {
            id: `gemini-stream-${Date.now()}`,
            content: text,
            isFirst,
            isLast: false,
          }
          isFirst = false
        }
      }

      // Final chunk
      const latencyMs = Date.now() - startTime
      const completionTokens = Math.ceil(totalContent.length / 4)

      // Record cost
      const costTracker = getCostTracker()
      await costTracker.recordCost({
        provider: 'gemini',
        model: modelId,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        latencyMs,
      })

      yield {
        id: `gemini-stream-${Date.now()}`,
        content: '',
        finishReason: 'stop',
        isLast: true,
      }

      logger.response('gemini', modelId, latencyMs, {
        streaming: true,
        tokens: promptTokens + completionTokens,
      })
    } catch (error) {
      logger.error('GeminiProvider', 'Stream failed', {
        model: modelId,
        error: String(error),
      })
      throw error
    }
  }

  /**
   * Health check
   */
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
      logger.healthCheck('gemini', true, latencyMs)

      return {
        provider: 'gemini',
        model: testModel,
        healthy: true,
        latencyMs,
        timestamp: new Date(),
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.healthCheck('gemini', false, latencyMs)

      return {
        provider: 'gemini',
        model: testModel,
        healthy: false,
        latencyMs,
        error: errorMessage,
        timestamp: new Date(),
      }
    }
  }

  /**
   * Cancel ongoing requests (not fully supported by Gemini SDK)
   */
  cancel(): void {
    // Gemini SDK doesn't have built-in cancellation
    logger.warn('GeminiProvider', 'Cancel not fully supported by Gemini SDK')
  }

  /**
   * Convert OpenAI-style messages to Gemini format
   */
  private convertMessages(messages: CompletionOptions['messages']): Array<{
    role: 'user' | 'model'
    parts: Array<{ text: string }>
  }> {
    const contents: Array<{
      role: 'user' | 'model'
      parts: Array<{ text: string }>
    }> = []

    // Handle system message by prepending to first user message
    let systemContent = ''
    const filteredMessages = messages.filter(msg => {
      if (msg.role === 'system') {
        systemContent = msg.content + '\n\n'
        return false
      }
      return true
    })

    for (let i = 0; i < filteredMessages.length; i++) {
      const msg = filteredMessages[i]
      const role = msg.role === 'assistant' ? 'model' : 'user'
      let content = msg.content

      // Prepend system message to first user message
      if (i === 0 && role === 'user' && systemContent) {
        content = systemContent + content
      }

      contents.push({
        role,
        parts: [{ text: content }],
      })
    }

    return contents
  }

  /**
   * Estimate token count for rate limiting
   */
  private estimateTokens(messages: CompletionOptions['messages']): number {
    let estimate = 0
    for (const message of messages) {
      estimate += Math.ceil(message.content.length / 4)
    }
    return estimate
  }
}

/**
 * Factory function for easy creation
 */
export function createGeminiProvider(apiKey: string, options?: Partial<ProviderConfig>) {
  return new GeminiProvider({ apiKey, ...options })
}
