/**
 * OpenRouter Provider - Comprehensive model support for OpenRouter API
 * 
 * OpenRouter provides access to models from OpenAI, Anthropic, Google, Meta,
 * Mistral, and many other providers through a unified API.
 */

import { BaseProvider } from './base'
import type {
  ProviderName,
  ProviderConfig,
  ModelInfo,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from '../types'

// OpenRouter-specific response types
interface OpenRouterChoice {
  index: number
  message: {
    role: string
    content: string
    function_call?: {
      name: string
      arguments: string
    }
    tool_calls?: Array<{
      id: string
      type: 'function'
      function: {
        name: string
        arguments: string
      }
    }>
  }
  finish_reason: string
}

interface OpenRouterResponse {
  id: string
  model: string
  choices: OpenRouterChoice[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface OpenRouterStreamDelta {
  id: string
  choices: Array<{
    index: number
    delta: {
      content?: string
      role?: string
      tool_calls?: Array<{
        index: number
        id?: string
        type?: 'function'
        function?: {
          name?: string
          arguments?: string
        }
      }>
    }
    finish_reason?: string
  }>
}

// Default OpenRouter configuration
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_RATE_LIMIT_RPM = 200 // Conservative default
const OPENROUTER_RATE_LIMIT_TPM = 100000

export class OpenRouterProvider extends BaseProvider {
  constructor(config: Partial<ProviderConfig> & { apiKey: string }) {
    super({
      name: 'openrouter',
      baseUrl: OPENROUTER_BASE_URL,
      defaultModel: 'openai/gpt-4o',
      enabled: true,
      timeout: 60000,
      maxRetries: 3,
      rateLimitRpm: OPENROUTER_RATE_LIMIT_RPM,
      rateLimitTpm: OPENROUTER_RATE_LIMIT_TPM,
      ...config,
    })
  }

  get providerName(): ProviderName {
    return 'openrouter'
  }

  protected getHeaders(): Record<string, string> {
    return {
      ...super.getHeaders(),
      'Authorization': `Bearer ${this.config.apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Networkly AI',
    }
  }

  protected initializeModels(): void {
    // OpenAI Models
    this.addModel({
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      provider: 'openrouter',
      contextLength: 128000,
      maxOutputTokens: 16384,
      capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
      costPer1kInputTokens: 0.005,
      costPer1kOutputTokens: 0.015,
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      tier: 'premium',
    })

    this.addModel({
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openrouter',
      contextLength: 128000,
      maxOutputTokens: 16384,
      capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
      costPer1kInputTokens: 0.00015,
      costPer1kOutputTokens: 0.0006,
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      tier: 'standard',
    })

    this.addModel({
      id: 'openai/gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openrouter',
      contextLength: 128000,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
      costPer1kInputTokens: 0.01,
      costPer1kOutputTokens: 0.03,
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      tier: 'premium',
    })

    this.addModel({
      id: 'openai/o1-preview',
      name: 'o1 Preview',
      provider: 'openrouter',
      contextLength: 128000,
      maxOutputTokens: 32768,
      capabilities: ['chat', 'streaming'],
      costPer1kInputTokens: 0.015,
      costPer1kOutputTokens: 0.06,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'premium',
    })

    this.addModel({
      id: 'openai/o1-mini',
      name: 'o1 Mini',
      provider: 'openrouter',
      contextLength: 128000,
      maxOutputTokens: 65536,
      capabilities: ['chat', 'streaming'],
      costPer1kInputTokens: 0.003,
      costPer1kOutputTokens: 0.012,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'standard',
    })

    // Anthropic Models
    this.addModel({
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'openrouter',
      contextLength: 200000,
      maxOutputTokens: 8192,
      capabilities: ['chat', 'vision', 'function-calling', 'streaming'],
      costPer1kInputTokens: 0.003,
      costPer1kOutputTokens: 0.015,
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      tier: 'premium',
    })

    this.addModel({
      id: 'anthropic/claude-3-opus',
      name: 'Claude 3 Opus',
      provider: 'openrouter',
      contextLength: 200000,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'vision', 'function-calling', 'streaming'],
      costPer1kInputTokens: 0.015,
      costPer1kOutputTokens: 0.075,
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      tier: 'premium',
    })

    this.addModel({
      id: 'anthropic/claude-3-haiku',
      name: 'Claude 3 Haiku',
      provider: 'openrouter',
      contextLength: 200000,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'vision', 'function-calling', 'streaming'],
      costPer1kInputTokens: 0.00025,
      costPer1kOutputTokens: 0.00125,
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      tier: 'standard',
    })

    // Google Models
    this.addModel({
      id: 'google/gemini-2.0-flash-exp:free',
      name: 'Gemini 2.0 Flash (Free)',
      provider: 'openrouter',
      contextLength: 1048576,
      maxOutputTokens: 8192,
      capabilities: ['chat', 'vision', 'streaming'],
      costPer1kInputTokens: 0,
      costPer1kOutputTokens: 0,
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: false,
      tier: 'free',
    })

    this.addModel({
      id: 'google/gemini-pro-1.5',
      name: 'Gemini Pro 1.5',
      provider: 'openrouter',
      contextLength: 2097152,
      maxOutputTokens: 8192,
      capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
      costPer1kInputTokens: 0.00125,
      costPer1kOutputTokens: 0.005,
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      tier: 'standard',
    })

    this.addModel({
      id: 'google/gemini-flash-1.5',
      name: 'Gemini Flash 1.5',
      provider: 'openrouter',
      contextLength: 1048576,
      maxOutputTokens: 8192,
      capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
      costPer1kInputTokens: 0.000075,
      costPer1kOutputTokens: 0.0003,
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      tier: 'standard',
    })

    // Meta Llama Models
    this.addModel({
      id: 'meta-llama/llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B Instruct',
      provider: 'openrouter',
      contextLength: 131072,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'function-calling', 'streaming'],
      costPer1kInputTokens: 0.00035,
      costPer1kOutputTokens: 0.0004,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'standard',
    })

    this.addModel({
      id: 'meta-llama/llama-3.1-405b-instruct',
      name: 'Llama 3.1 405B Instruct',
      provider: 'openrouter',
      contextLength: 131072,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'function-calling', 'streaming'],
      costPer1kInputTokens: 0.002,
      costPer1kOutputTokens: 0.002,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'premium',
    })

    this.addModel({
      id: 'meta-llama/llama-3.1-8b-instruct:free',
      name: 'Llama 3.1 8B (Free)',
      provider: 'openrouter',
      contextLength: 131072,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'streaming'],
      costPer1kInputTokens: 0,
      costPer1kOutputTokens: 0,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'free',
    })

    // Mistral Models
    this.addModel({
      id: 'mistralai/mistral-large',
      name: 'Mistral Large',
      provider: 'openrouter',
      contextLength: 128000,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'function-calling', 'json-mode', 'streaming'],
      costPer1kInputTokens: 0.002,
      costPer1kOutputTokens: 0.006,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'premium',
    })

    this.addModel({
      id: 'mistralai/mixtral-8x7b-instruct',
      name: 'Mixtral 8x7B Instruct',
      provider: 'openrouter',
      contextLength: 32768,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'function-calling', 'streaming'],
      costPer1kInputTokens: 0.00024,
      costPer1kOutputTokens: 0.00024,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'standard',
    })

    this.addModel({
      id: 'mistralai/mistral-7b-instruct:free',
      name: 'Mistral 7B (Free)',
      provider: 'openrouter',
      contextLength: 32768,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'streaming'],
      costPer1kInputTokens: 0,
      costPer1kOutputTokens: 0,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'free',
    })

    // DeepSeek Models
    this.addModel({
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'openrouter',
      contextLength: 64000,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'function-calling', 'streaming'],
      costPer1kInputTokens: 0.00014,
      costPer1kOutputTokens: 0.00028,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'standard',
    })

    this.addModel({
      id: 'deepseek/deepseek-r1',
      name: 'DeepSeek R1',
      provider: 'openrouter',
      contextLength: 64000,
      maxOutputTokens: 8192,
      capabilities: ['chat', 'streaming'],
      costPer1kInputTokens: 0.00055,
      costPer1kOutputTokens: 0.00219,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'standard',
    })

    // Qwen Models
    this.addModel({
      id: 'qwen/qwen-2.5-72b-instruct',
      name: 'Qwen 2.5 72B Instruct',
      provider: 'openrouter',
      contextLength: 131072,
      maxOutputTokens: 8192,
      capabilities: ['chat', 'function-calling', 'streaming'],
      costPer1kInputTokens: 0.00035,
      costPer1kOutputTokens: 0.0004,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'standard',
    })

    this.addModel({
      id: 'qwen/qwen-2.5-coder-32b-instruct',
      name: 'Qwen 2.5 Coder 32B',
      provider: 'openrouter',
      contextLength: 131072,
      maxOutputTokens: 8192,
      capabilities: ['chat', 'function-calling', 'streaming'],
      costPer1kInputTokens: 0.00018,
      costPer1kOutputTokens: 0.00018,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'standard',
    })

    // Cohere Models
    this.addModel({
      id: 'cohere/command-r-plus',
      name: 'Command R+',
      provider: 'openrouter',
      contextLength: 128000,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'function-calling', 'streaming'],
      costPer1kInputTokens: 0.003,
      costPer1kOutputTokens: 0.015,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'premium',
    })

    // Perplexity Models
    this.addModel({
      id: 'perplexity/llama-3.1-sonar-large-128k-online',
      name: 'Sonar Large Online',
      provider: 'openrouter',
      contextLength: 127072,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'streaming'],
      costPer1kInputTokens: 0.001,
      costPer1kOutputTokens: 0.001,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'premium',
    })
  }

  private addModel(model: ModelInfo): void {
    this.models.set(model.id, model)
  }

  protected buildRequestBody(options: CompletionOptions): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: options.model,
      messages: options.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
        ...(msg.functionCall && { function_call: msg.functionCall }),
      })),
      stream: options.stream ?? false,
    }

    if (options.temperature !== undefined) body.temperature = options.temperature
    if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens
    if (options.topP !== undefined) body.top_p = options.topP
    if (options.frequencyPenalty !== undefined) body.frequency_penalty = options.frequencyPenalty
    if (options.presencePenalty !== undefined) body.presence_penalty = options.presencePenalty
    if (options.stop) body.stop = options.stop
    if (options.responseFormat) body.response_format = options.responseFormat
    if (options.tools) body.tools = options.tools
    if (options.toolChoice) body.tool_choice = options.toolChoice

    return body
  }

  protected parseResponse(response: unknown): CompletionResult {
    const data = response as OpenRouterResponse
    const choice = data.choices[0]

    return {
      id: data.id,
      provider: 'openrouter',
      model: data.model,
      content: choice.message.content || '',
      finishReason: this.mapFinishReason(choice.finish_reason),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      functionCall: choice.message.function_call,
      toolCalls: choice.message.tool_calls,
      latencyMs: 0, // Will be set by base class
    }
  }

  protected parseStreamChunk(chunk: unknown): StreamChunk | null {
    const data = chunk as OpenRouterStreamDelta
    const choice = data.choices?.[0]

    if (!choice) return null

    const finishReason = choice.finish_reason
      ? this.mapFinishReason(choice.finish_reason)
      : undefined

    const toolCall = choice.delta?.tool_calls?.[0]

    return {
      id: data.id,
      content: choice.delta?.content || '',
      finishReason: finishReason === 'content_filter' ? 'stop' : finishReason,
      isLast: !!choice.finish_reason,
      toolCallDelta: toolCall ? {
        index: toolCall.index,
        id: toolCall.id,
        type: toolCall.type,
        function: toolCall.function,
      } : undefined,
    }
  }

  private mapFinishReason(
    reason: string
  ): 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter' {
    switch (reason) {
      case 'stop':
        return 'stop'
      case 'length':
        return 'length'
      case 'function_call':
        return 'function_call'
      case 'tool_calls':
        return 'tool_calls'
      case 'content_filter':
        return 'content_filter'
      default:
        return 'stop'
    }
  }
}

// Factory function for easy creation
export function createOpenRouterProvider(apiKey: string, options?: Partial<ProviderConfig>) {
  return new OpenRouterProvider({ apiKey, ...options })
}
