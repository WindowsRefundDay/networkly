/**
 * Groq Provider - Ultra-fast inference with Groq's LPU technology
 * 
 * Groq offers extremely fast inference for open-source models including
 * Llama, Mixtral, and Gemma.
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

// Groq-specific response types
interface GroqChoice {
  index: number
  message: {
    role: string
    content: string
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

interface GroqResponse {
  id: string
  object: string
  created: number
  model: string
  choices: GroqChoice[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    queue_time?: number
    prompt_time?: number
    completion_time?: number
    total_time?: number
  }
}

interface GroqStreamDelta {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      content?: string
      role?: string
    }
    finish_reason?: string
  }>
  x_groq?: {
    usage?: {
      queue_time: number
      prompt_tokens: number
      prompt_time: number
      completion_tokens: number
      completion_time: number
      total_tokens: number
      total_time: number
    }
  }
}

// Default Groq configuration
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_RATE_LIMIT_RPM = 30 // Free tier is limited
const GROQ_RATE_LIMIT_TPM = 14400 // Free tier token limit per minute

export class GroqProvider extends BaseProvider {
  constructor(config: Partial<ProviderConfig> & { apiKey: string }) {
    super({
      name: 'groq',
      baseUrl: GROQ_BASE_URL,
      defaultModel: 'llama-3.3-70b-versatile',
      enabled: true,
      timeout: 30000, // Groq is very fast
      maxRetries: 3,
      rateLimitRpm: GROQ_RATE_LIMIT_RPM,
      rateLimitTpm: GROQ_RATE_LIMIT_TPM,
      ...config,
    })
  }

  get providerName(): ProviderName {
    return 'groq'
  }

  protected getHeaders(): Record<string, string> {
    return {
      ...super.getHeaders(),
      'Authorization': `Bearer ${this.config.apiKey}`,
    }
  }

  protected initializeModels(): void {
    // =========================================================================
    // Models from Groq API (https://api.groq.com/openai/v1/models)
    // All models are FREE on Groq's LPU infrastructure
    // =========================================================================

    // Llama 3.3 - Flagship Model
    this.addModel({
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 32768,
      capabilities: ['chat', 'function-calling', 'json-mode', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'free',
    })

    // Llama 3.1 - Fast Model
    this.addModel({
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 131072,
      capabilities: ['chat', 'function-calling', 'json-mode', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'free',
    })

    // Llama 4 Scout - Latest
    this.addModel({
      id: 'meta-llama/llama-4-scout-17b-16e-instruct',
      name: 'Llama 4 Scout 17B',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 8192,
      capabilities: ['chat', 'function-calling', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'free',
    })

    // Llama 4 Maverick - Creative
    this.addModel({
      id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      name: 'Llama 4 Maverick 17B',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 8192,
      capabilities: ['chat', 'function-calling', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'free',
    })

    // Qwen 3 - Excellent for code
    this.addModel({
      id: 'qwen/qwen3-32b',
      name: 'Qwen 3 32B',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 40960,
      capabilities: ['chat', 'function-calling', 'json-mode', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'free',
    })

    // OpenAI GPT OSS 20B
    this.addModel({
      id: 'openai/gpt-oss-20b',
      name: 'GPT OSS 20B',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 65536,
      capabilities: ['chat', 'function-calling', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'free',
    })

    // OpenAI GPT OSS 120B - High quality
    this.addModel({
      id: 'openai/gpt-oss-120b',
      name: 'GPT OSS 120B',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 65536,
      capabilities: ['chat', 'function-calling', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'free',
    })

    // Kimi K2 - Long context (262K!)
    this.addModel({
      id: 'moonshotai/kimi-k2-instruct',
      name: 'Kimi K2 Instruct',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 16384,
      capabilities: ['chat', 'function-calling', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'free',
    })

    // Kimi K2 Latest - 262K context
    this.addModel({
      id: 'moonshotai/kimi-k2-instruct-0905',
      name: 'Kimi K2 Instruct (Latest)',
      provider: 'groq',
      contextLength: 262144,
      maxOutputTokens: 16384,
      capabilities: ['chat', 'function-calling', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'free',
    })

    // Groq Compound - Agentic/Tool Use
    this.addModel({
      id: 'groq/compound',
      name: 'Groq Compound',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 8192,
      capabilities: ['chat', 'function-calling', 'json-mode', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'free',
    })

    // Groq Compound Mini - Fast Agentic
    this.addModel({
      id: 'groq/compound-mini',
      name: 'Groq Compound Mini',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 8192,
      capabilities: ['chat', 'function-calling', 'json-mode', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      tier: 'free',
    })

    // Llama Guard 4 - Content Safety
    this.addModel({
      id: 'meta-llama/llama-guard-4-12b',
      name: 'Llama Guard 4 12B',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 1024,
      capabilities: ['chat', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'free',
    })

    // GPT OSS Safeguard
    this.addModel({
      id: 'openai/gpt-oss-safeguard-20b',
      name: 'GPT OSS Safeguard 20B',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 65536,
      capabilities: ['chat', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'free',
    })

    // Prompt Guard Models
    this.addModel({
      id: 'meta-llama/llama-prompt-guard-2-86m',
      name: 'Llama Prompt Guard 86M',
      provider: 'groq',
      contextLength: 512,
      maxOutputTokens: 512,
      capabilities: ['chat'],
      supportsStreaming: false,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'free',
    })

    this.addModel({
      id: 'meta-llama/llama-prompt-guard-2-22m',
      name: 'Llama Prompt Guard 22M',
      provider: 'groq',
      contextLength: 512,
      maxOutputTokens: 512,
      capabilities: ['chat'],
      supportsStreaming: false,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'free',
    })

    // Whisper - Speech to Text
    this.addModel({
      id: 'whisper-large-v3',
      name: 'Whisper Large V3',
      provider: 'groq',
      contextLength: 448,
      maxOutputTokens: 448,
      capabilities: ['completion'],
      supportsStreaming: false,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'free',
    })

    this.addModel({
      id: 'whisper-large-v3-turbo',
      name: 'Whisper Large V3 Turbo',
      provider: 'groq',
      contextLength: 448,
      maxOutputTokens: 448,
      capabilities: ['completion'],
      supportsStreaming: false,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'free',
    })

    // Allam - Arabic Language Model
    this.addModel({
      id: 'allam-2-7b',
      name: 'Allam 2 7B',
      provider: 'groq',
      contextLength: 4096,
      maxOutputTokens: 4096,
      capabilities: ['chat', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'free',
    })

    // DeepSeek Models
    this.addModel({
      id: 'deepseek-r1-distill-llama-70b',
      name: 'DeepSeek R1 Distill Llama 70B',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 16384,
      capabilities: ['chat', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'standard',
    })

    this.addModel({
      id: 'deepseek-r1-distill-qwen-32b',
      name: 'DeepSeek R1 Distill Qwen 32B',
      provider: 'groq',
      contextLength: 131072,
      maxOutputTokens: 16384,
      capabilities: ['chat', 'streaming'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'standard',
    })

    // Whisper (Audio)
    this.addModel({
      id: 'whisper-large-v3',
      name: 'Whisper Large V3',
      provider: 'groq',
      contextLength: 0, // Audio model
      capabilities: ['completion'],
      supportsStreaming: false,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'standard',
    })

    this.addModel({
      id: 'whisper-large-v3-turbo',
      name: 'Whisper Large V3 Turbo',
      provider: 'groq',
      contextLength: 0, // Audio model
      capabilities: ['completion'],
      supportsStreaming: false,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'standard',
    })

    // Distil Whisper
    this.addModel({
      id: 'distil-whisper-large-v3-en',
      name: 'Distil Whisper Large V3 EN',
      provider: 'groq',
      contextLength: 0, // Audio model
      capabilities: ['completion'],
      supportsStreaming: false,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'free',
    })

    // PlayAI TTS
    this.addModel({
      id: 'playai-tts',
      name: 'PlayAI TTS',
      provider: 'groq',
      contextLength: 0, // TTS model
      capabilities: ['completion'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'standard',
    })

    this.addModel({
      id: 'playai-tts-arabic',
      name: 'PlayAI TTS Arabic',
      provider: 'groq',
      contextLength: 0, // TTS model
      capabilities: ['completion'],
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      tier: 'standard',
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
    const data = response as GroqResponse
    const choice = data.choices[0]

    return {
      id: data.id,
      provider: 'groq',
      model: data.model,
      content: choice.message.content || '',
      finishReason: this.mapFinishReason(choice.finish_reason),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      toolCalls: choice.message.tool_calls,
      latencyMs: 0, // Will be set by base class
    }
  }

  protected parseStreamChunk(chunk: unknown): StreamChunk | null {
    const data = chunk as GroqStreamDelta
    const choice = data.choices?.[0]

    if (!choice) return null

    return {
      id: data.id,
      content: choice.delta?.content || '',
      finishReason: choice.finish_reason
        ? this.mapFinishReason(choice.finish_reason)
        : undefined,
      isLast: !!choice.finish_reason,
    }
  }

  private mapFinishReason(
    reason: string
  ): 'stop' | 'length' | 'function_call' | 'tool_calls' {
    switch (reason) {
      case 'stop':
        return 'stop'
      case 'length':
        return 'length'
      case 'function_call':
        return 'function_call'
      case 'tool_calls':
        return 'tool_calls'
      default:
        return 'stop'
    }
  }

  // Groq-specific: Get speed metrics
  getSpeedMetrics(response: GroqResponse): {
    queueTimeMs: number
    promptTimeMs: number
    completionTimeMs: number
    totalTimeMs: number
    tokensPerSecond: number
  } | null {
    const usage = response.usage
    if (!usage.total_time) return null

    return {
      queueTimeMs: (usage.queue_time || 0) * 1000,
      promptTimeMs: (usage.prompt_time || 0) * 1000,
      completionTimeMs: (usage.completion_time || 0) * 1000,
      totalTimeMs: (usage.total_time || 0) * 1000,
      tokensPerSecond: usage.completion_tokens / (usage.completion_time || 1),
    }
  }
}

// Factory function for easy creation
export function createGroqProvider(apiKey: string, options?: Partial<ProviderConfig>) {
  return new GroqProvider({ apiKey, ...options })
}
