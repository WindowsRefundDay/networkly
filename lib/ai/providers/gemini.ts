/**
 * Gemini Provider - Vercel AI SDK integration
 *
 * Uses the AI SDK with the Google provider for Gemini models.
 * Supports latest Gemini 2.5 models and legacy models.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createVertex } from '@ai-sdk/google-vertex'
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
  VertexConfig,
} from '../types'
import { AIProviderError, AuthenticationError } from '../types'
import { logger } from '../utils/logger'
import { getCostTracker } from '../utils/cost-tracker'


// Gemini model definitions with pricing (Updated January 2026)
// https://ai.google.dev/gemini-api/docs/models/gemini
// Using latest models: gemini-3-flash-preview for heavy tasks, gemini-2.5-flash-lite for cost-effective defaults
const GEMINI_MODELS: Record<string, Omit<ModelInfo, 'id' | 'provider'>> = {
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
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
}

// Default to cost-effective 2.5 Flash Lite for balanced cost/performance
const DEFAULT_MODEL = 'gemini-2.5-flash'

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
  private googleProvider: ReturnType<typeof createGoogleGenerativeAI> | ReturnType<typeof createVertex>
  private useVertexAI: boolean

  constructor(config: Partial<ProviderConfig> & { apiKey?: string; useVertexAI?: boolean; vertexConfig?: VertexConfig }) {
    const { apiKey, useVertexAI, vertexConfig, ...restConfig } = config

    // Determine authentication mode
    this.useVertexAI = useVertexAI ?? true // Default to Vertex AI

    this.config = {
      name: 'gemini',
      apiKey: apiKey || '', // May be empty for Vertex AI
      baseUrl: 'https://generativelanguage.googleapis.com',
      defaultModel: restConfig.defaultModel || DEFAULT_MODEL,
      enabled: restConfig.enabled ?? true,
      timeout: restConfig.timeout ?? 60000,
      maxRetries: restConfig.maxRetries ?? 3,
      useVertexAI: this.useVertexAI,
      vertexConfig,
      ...restConfig,
    }

    // Initialize provider based on authentication mode
    if (this.useVertexAI) {
      // Vertex AI mode - uses Google Cloud authentication
      const project = vertexConfig?.project || process.env.GOOGLE_VERTEX_PROJECT
      const location = vertexConfig?.location || process.env.GOOGLE_VERTEX_LOCATION || 'us-central1'

      if (!project) {
        throw new Error('GOOGLE_VERTEX_PROJECT is required when useVertexAI is true')
      }

      // Check for JSON credentials in env var (for Vercel deployment)
      let credentials = vertexConfig?.credentials
      if (!credentials && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
          const parsed = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
          credentials = {
            client_email: parsed.client_email,
            private_key: parsed.private_key,
          }
        } catch (error) {
          console.error('[GeminiProvider] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error)
        }
      }

      this.googleProvider = createVertex({
        project,
        location,
        googleAuthOptions: credentials ? {
          credentials,
        } : {
          // Use Application Default Credentials (ADC)
          // This works with: gcloud auth application-default login
          // Or GOOGLE_APPLICATION_CREDENTIALS env var pointing to JSON file
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        },
      })

      logger.info('GeminiProvider', `Initialized with Vertex AI (${project}, ${location})`)
    } else {
      // API key mode - traditional Gemini Developer API
      if (!apiKey) {
        throw new Error('apiKey is required when useVertexAI is false')
      }

      this.googleProvider = createGoogleGenerativeAI({
        apiKey,
      })

      logger.info('GeminiProvider', 'Initialized with API key authentication')
    }

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
    const modelId = DEFAULT_MODEL // Strict enforcement: gemini-2.5-flash
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
    const modelId = DEFAULT_MODEL // Strict enforcement: gemini-2.5-flash
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
      let hasToolCalls = false

      for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
          totalContent += part.text
          yield {
            id: `gemini-stream-${Date.now()}`,
            content: part.text,
            isFirst,
            isLast: false,
          }
          isFirst = false
        } else if (part.type === 'tool-call') {
          hasToolCalls = true
          yield {
            id: `gemini-stream-${Date.now()}`,
            content: '',
            isFirst,
            isLast: false,
            toolCalls: [{
              id: part.toolCallId,
              type: 'function',
              function: {
                name: part.toolName,
                arguments: JSON.stringify(part.input),
              },
            }],
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
        finishReason: hasToolCalls ? 'tool_calls' : 'stop',
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
  private convertMessages(messages: any[]): any[] {
    return messages.map((msg) => {
      if (msg.role === 'assistant') {
        const coreMsg: any = { role: 'assistant', content: msg.content || '' }

        // Handle tool calls
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          // FIX: Ensure content is strictly a string, even if empty.
          // The AI SDK schema requires 'content' to be a string, not undefined.
          coreMsg.content = (msg.content && typeof msg.content === 'string') ? msg.content : ''

          coreMsg.toolCalls = msg.toolCalls.map((tc: any) => ({
            type: 'function',
            toolCallId: tc.id || tc.toolCallId,
            toolName: tc.function.name,
            args: typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments || '{}')
              : tc.function.arguments,
          }))
        }
        return coreMsg
      }

      if (msg.role === 'system') {
        return { role: 'system', content: msg.content }
      }

      if (msg.role === 'function') {
        // Map legacy function role to tool role
        return {
          role: 'tool',
          content: [{
            type: 'tool-result',
            toolCallId: msg.toolCallId || 'unknown',
            toolName: msg.name,
            result: msg.content, // AI SDK Core expects 'result' to be the output
          }]
        }
      }

      // Default to user message
      return { role: 'user', content: msg.content }
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