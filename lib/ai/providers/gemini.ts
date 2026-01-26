/**
 * Gemini Provider - Vercel AI SDK integration
 *
 * Uses the AI SDK with the Google provider for Gemini models.
 * Supports latest Gemini 2.5 models and legacy models.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, streamText, jsonSchema } from 'ai'
import type {
  ProviderName,
  ProviderConfig,
  ModelInfo,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
  HealthCheckResult,
  ToolDefinition,
} from '../types'
import { AIProviderError, AuthenticationError } from '../types'
import { logger } from '../utils/logger'
import { getCostTracker } from '../utils/cost-tracker'

// Message type for AI SDK
type AIMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Gemini model definitions with pricing (Updated January 2026)
// https://ai.google.dev/gemini-api/docs/models/gemini
// Using latest models: gemini-3-flash-preview for heavy tasks, gemini-2.5-flash-lite for cost-effective defaults
const GEMINI_MODELS: Record<string, Omit<ModelInfo, 'id' | 'provider'>> = {
  // =========================================================================
  // GEMINI 3 - LATEST PREVIEW MODELS (January 2026)
  // =========================================================================
  
  'gemini-3-pro-preview': {
    name: 'Gemini 3 Pro Preview',
    contextLength: 1048576,
    maxOutputTokens: 65536,
    capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
    costPer1kInputTokens: 0.00125,   // $1.25/1M input (estimated, similar to 2.5-pro)
    costPer1kOutputTokens: 0.01,      // $10/1M output (estimated)
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    tier: 'premium',
  },
  
  'gemini-3-flash-preview': {
    name: 'Gemini 3 Flash Preview',
    contextLength: 1048576,
    maxOutputTokens: 65536,
    capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
    costPer1kInputTokens: 0.00015,   // $0.15/1M input (estimated, similar to 2.5-flash)
    costPer1kOutputTokens: 0.0006,    // $0.60/1M output (estimated)
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    tier: 'premium',
  },
  
  // =========================================================================
  // GEMINI 2.5 - STABLE PRODUCTION MODELS (January 2026)
  // =========================================================================
  
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    contextLength: 1048576,
    maxOutputTokens: 65536,
    capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
    costPer1kInputTokens: 0.00125,   // $1.25/1M input
    costPer1kOutputTokens: 0.01,      // $10/1M output
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    tier: 'premium',
  },
  
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    contextLength: 1048576,
    maxOutputTokens: 65536,
    capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
    costPer1kInputTokens: 0.00015,   // $0.15/1M input
    costPer1kOutputTokens: 0.0006,    // $0.60/1M output
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    tier: 'standard',
  },
  
  'gemini-2.5-flash-lite': {
    name: 'Gemini 2.5 Flash Lite',
    contextLength: 1048576,
    maxOutputTokens: 65536,
    capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
    costPer1kInputTokens: 0.000075,  // $0.075/1M input (most cost-effective)
    costPer1kOutputTokens: 0.0003,    // $0.30/1M output
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    tier: 'standard',
  },

  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    contextLength: 1048576,
    maxOutputTokens: 8192,
    capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
    costPer1kInputTokens: 0.0001,    // $0.10/1M input
    costPer1kOutputTokens: 0.0004,    // $0.40/1M output
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    tier: 'standard',
  },
}

// Default to cost-effective 2.5 Flash Lite for balanced cost/performance
const DEFAULT_MODEL = 'gemini-2.5-flash-lite'

// Map AI SDK finish reasons to our internal format
function mapFinishReason(reason: string | undefined): 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter' {
  switch (reason) {
    case 'stop':
      return 'stop'
    case 'length':
      return 'length'
    case 'tool-calls':
      return 'tool_calls'
    case 'content-filter':
      return 'content_filter'
    default:
      return 'stop'
  }
}

/**
 * Convert OpenAI-style tool definitions to AI SDK format
 * AI SDK expects tools as an object with tool names as keys
 */
function convertToolsToAISDK(tools: ToolDefinition[]): Record<string, { description: string; inputSchema: ReturnType<typeof jsonSchema> }> {
  const result: Record<string, { description: string; inputSchema: ReturnType<typeof jsonSchema> }> = {}
  for (const tool of tools) {
    result[tool.function.name] = {
      description: tool.function.description,
      inputSchema: jsonSchema(tool.function.parameters as Record<string, unknown>),
    }
  }
  return result
}

/**
 * Convert AI SDK toolChoice to the format expected by generateText/streamText
 */
function convertToolChoice(toolChoice: CompletionOptions['toolChoice']): 'auto' | 'none' | 'required' | { type: 'tool'; toolName: string } | undefined {
  if (!toolChoice) return undefined
  if (toolChoice === 'auto') return 'auto'
  if (toolChoice === 'none') return 'none'
  if (typeof toolChoice === 'object' && toolChoice.type === 'function') {
    return { type: 'tool', toolName: toolChoice.function.name }
  }
  return 'auto'
}

export class GeminiProvider {
  private config: ProviderConfig
  private models: Map<string, ModelInfo> = new Map()
  private googleProvider: ReturnType<typeof createGoogleGenerativeAI>

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

    // Create Google provider instance with API key
    this.googleProvider = createGoogleGenerativeAI({
      apiKey: this.config.apiKey,
    })

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
      hasTools: !!options.tools?.length,
    })

    try {
      const model = this.createModel(modelId)
      const messages = this.convertMessages(options.messages)

      // Convert tools if provided
      const tools = options.tools?.length ? convertToolsToAISDK(options.tools) : undefined
      const toolChoice = options.toolChoice ? convertToolChoice(options.toolChoice) : undefined

      const result = await this.withRetry(() => generateText({
        model,
        messages,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
        topP: options.topP,
        stopSequences: options.stop,
        tools,
        toolChoice,
      }))

      const text = result.text
      const latencyMs = Date.now() - startTime

      // AI SDK uses inputTokens/outputTokens
      const promptTokens = result.usage?.inputTokens || this.estimateTokens(options.messages)
      const completionTokens = result.usage?.outputTokens || Math.ceil(text.length / 4)
      const totalTokens = promptTokens + completionTokens

      // Convert AI SDK tool calls to OpenAI format
      const toolCalls = result.toolCalls?.length ? result.toolCalls.map(tc => ({
        id: tc.toolCallId,
        type: 'function' as const,
        function: {
          name: tc.toolName,
          arguments: JSON.stringify(tc.input),
        }
      })) : undefined

      // Determine finish reason based on tool calls
      const finishReason = toolCalls?.length ? 'tool_calls' : mapFinishReason(result.finishReason)

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
        finishReason,
        toolCalls: toolCalls?.length || 0,
      })

      return {
        id: `gemini-${Date.now()}`,
        provider: 'gemini',
        model: modelId,
        content: text,
        finishReason,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        toolCalls,
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

    logger.request('gemini', modelId, { streaming: true, hasTools: !!options.tools?.length })

    try {
      const model = this.createModel(modelId)
      const messages = this.convertMessages(options.messages)

      const tools = options.tools?.length ? convertToolsToAISDK(options.tools) : undefined
      const toolChoice = options.toolChoice ? convertToolChoice(options.toolChoice) : undefined

      const result = streamText({
        model,
        messages,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
        topP: options.topP,
        stopSequences: options.stop,
        tools,
        toolChoice,
      })

      let isFirst = true
      let totalContent = ''
      let promptTokens = this.estimateTokens(options.messages)

      for await (const text of result.textStream) {
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
      const usage = await result.usage
      const completionTokens = usage?.outputTokens || Math.ceil(totalContent.length / 4)
      promptTokens = usage?.inputTokens || promptTokens

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
    // AI SDK doesn't support cancellation
    logger.warn('GeminiProvider', 'Cancel not fully supported by AI SDK')
  }

  /**
   * Convert OpenAI-style messages to AI SDK format
   */
  private convertMessages(messages: CompletionOptions['messages']): AIMessage[] {
    return messages.map((msg) => {
      if (msg.role === 'assistant') {
        return { role: 'assistant' as const, content: msg.content }
      }
      if (msg.role === 'system') {
        return { role: 'system' as const, content: msg.content }
      }
      return { role: 'user' as const, content: msg.content }
    })
  }

  private createModel(modelId: string) {
    return this.googleProvider(modelId)
  }

  private isRateLimitError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes('429') || message.toLowerCase().includes('resource_exhausted') || message.toLowerCase().includes('rate limit')
  }

  private getRetryDelayMs(error: unknown, attempt: number): number {
    const message = error instanceof Error ? error.message : String(error)
    const match = message.toLowerCase().match(/retry in (\d+(?:\.\d+)?)/)
    if (match) {
      return Math.min(Number(match[1]) * 1000 + 250, 30000)
    }
    const base = 500
    return Math.min(base * Math.pow(2, attempt), 30000)
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.maxRetries ?? 3
    let lastError: unknown
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        if (this.isRateLimitError(error) && attempt < maxRetries) {
          const delay = this.getRetryDelayMs(error, attempt)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        throw error
      }
    }
    throw lastError
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
