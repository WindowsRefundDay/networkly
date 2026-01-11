/**
 * AI Model Configurations - Modular provider configs for different use cases
 * 
 * This file defines model configurations for different AI providers,
 * allowing easy switching between Groq (free) and Gemini (Google) models.
 */

import type { UseCase } from './types'

// ============================================================================
// Model Configuration Types
// ============================================================================

export interface ModelConfig {
  /** Model identifier for the provider */
  id: string
  /** Human-readable name */
  name: string
  /** Context window size */
  contextWindow: number
  /** Maximum output tokens */
  maxOutputTokens: number
  /** Recommended temperature for this model */
  defaultTemperature?: number
  /** Speed tier: fast, medium, slow */
  speedTier: 'fast' | 'medium' | 'slow'
  /** Quality tier: basic, standard, premium */
  qualityTier: 'basic' | 'standard' | 'premium'
  /** Whether this model is free to use */
  isFree: boolean
}

export interface UseCaseModelMapping {
  /** Primary model for this use case */
  primary: string
  /** Fallback models in order of preference */
  fallbacks: string[]
  /** System prompt for this use case */
  systemPrompt?: string
  /** Default temperature */
  temperature?: number
  /** Maximum tokens for response */
  maxTokens?: number
}

export interface ProviderModelConfig {
  /** Provider name */
  name: string
  /** Display name */
  displayName: string
  /** Whether this config is for free tier usage */
  isFree: boolean
  /** Available models */
  models: Record<string, ModelConfig>
  /** Use case to model mappings */
  useCases: Record<UseCase, UseCaseModelMapping>
  /** Default model for general use */
  defaultModel: string
}

// ============================================================================
// GROQ Configuration (Free Tier)
// ============================================================================

export const GROQ_MODELS: Record<string, ModelConfig> = {
  // =========================================================================
  // TIER 1: TOP PERFORMERS (Production Ready)
  // Best overall quality based on independent benchmarks
  // =========================================================================

  /** GPT OSS 120B - Best Overall: 90% MMLU, 500 t/s */
  'openai/gpt-oss-120b': {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B (Best Quality)',
    contextWindow: 131072,
    maxOutputTokens: 65536,
    defaultTemperature: 0.7,
    speedTier: 'medium',
    qualityTier: 'premium',
    isFree: true,
  },

  /** Llama 3.3 70B - Best Production: 86% MMLU, 280 t/s */
  'llama-3.3-70b-versatile': {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Production)',
    contextWindow: 131072,
    maxOutputTokens: 32768,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'premium',
    isFree: true,
  },

  // =========================================================================
  // TIER 2: STRONG MID-RANGE (Production Ready)
  // =========================================================================

  /** Llama 3.1 8B - Fastest/Value: 560 t/s, $0.05 input */
  'llama-3.1-8b-instant': {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B (Fast/Value)',
    contextWindow: 131072,
    maxOutputTokens: 131072,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'standard',
    isFree: true,
  },

  /** GPT OSS 20B - Smaller GPT: 1000 t/s, cheaper */
  'openai/gpt-oss-20b': {
    id: 'openai/gpt-oss-20b',
    name: 'GPT OSS 20B',
    contextWindow: 131072,
    maxOutputTokens: 65536,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'standard',
    isFree: true,
  },

  // =========================================================================
  // TIER 3: PREVIEW MODELS (May be discontinued)
  // Not recommended for production - marked with (Preview)
  // =========================================================================

  /** Llama 4 Maverick - Creative: Beats Claude 3.7, 600 t/s */
  'meta-llama/llama-4-maverick-17b-128e-instruct': {
    id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick 17B (Preview)',
    contextWindow: 131072,
    maxOutputTokens: 8192,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'premium',
    isFree: true,
  },

  /** Llama 4 Scout - In-line with GPT-4o mini, 750 t/s */
  'meta-llama/llama-4-scout-17b-16e-instruct': {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout 17B (Preview)',
    contextWindow: 131072,
    maxOutputTokens: 8192,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'premium',
    isFree: true,
  },

  /** Qwen 3 32B - Strong coding: 400 t/s, ~74-75% MMLU */
  'qwen/qwen3-32b': {
    id: 'qwen/qwen3-32b',
    name: 'Qwen 3 32B (Preview)',
    contextWindow: 131072,
    maxOutputTokens: 40960,
    defaultTemperature: 0.7,
    speedTier: 'medium',
    qualityTier: 'premium',
    isFree: true,
  },

  /** Kimi K2 - Long context: 262K context, 200 t/s */
  'moonshotai/kimi-k2-instruct-0905': {
    id: 'moonshotai/kimi-k2-instruct-0905',
    name: 'Kimi K2 (Latest - Preview)',
    contextWindow: 262144,
    maxOutputTokens: 16384,
    defaultTemperature: 0.7,
    speedTier: 'medium',
    qualityTier: 'premium',
    isFree: true,
  },

  // =========================================================================
  // TIER 4: SPECIALIZED/TOOL MODELS (Production Ready)
  // =========================================================================

  /** Groq Compound - Agentic: Built for tool use, 450 t/s */
  'groq/compound': {
    id: 'groq/compound',
    name: 'Groq Compound (Agentic)',
    contextWindow: 131072,
    maxOutputTokens: 8192,
    defaultTemperature: 0.5,
    speedTier: 'fast',
    qualityTier: 'premium',
    isFree: true,
  },

  /** Llama Guard 4 12B - Safety: Content moderation, 1200 t/s */
  'meta-llama/llama-guard-4-12b': {
    id: 'meta-llama/llama-guard-4-12b',
    name: 'Llama Guard 4 12B (Safety)',
    contextWindow: 131072,
    maxOutputTokens: 1024,
    defaultTemperature: 0,
    speedTier: 'fast',
    qualityTier: 'standard',
    isFree: true,
  },

  /** Prompt Guard 86M - Prompt filtering */
  'meta-llama/llama-prompt-guard-2-86m': {
    id: 'meta-llama/llama-prompt-guard-2-86m',
    name: 'Llama Prompt Guard 86M',
    contextWindow: 512,
    maxOutputTokens: 512,
    defaultTemperature: 0,
    speedTier: 'fast',
    qualityTier: 'standard',
    isFree: true,
  },

  /** Prompt Guard 22M */
  'meta-llama/llama-prompt-guard-2-22m': {
    id: 'meta-llama/llama-prompt-guard-2-22m',
    name: 'Llama Prompt Guard 22M',
    contextWindow: 512,
    maxOutputTokens: 512,
    defaultTemperature: 0,
    speedTier: 'fast',
    qualityTier: 'standard',
    isFree: true,
  },

  /** GPT OSS Safeguard 20B - Safety */
  'openai/gpt-oss-safeguard-20b': {
    id: 'openai/gpt-oss-safeguard-20b',
    name: 'GPT OSS Safeguard 20B (Safety)',
    contextWindow: 131072,
    maxOutputTokens: 65536,
    defaultTemperature: 0,
    speedTier: 'fast',
    qualityTier: 'standard',
    isFree: true,
  },

  /** Whisper Large V3 - Speech to text */
  'whisper-large-v3': {
    id: 'whisper-large-v3',
    name: 'Whisper Large V3 (STT)',
    contextWindow: 448,
    maxOutputTokens: 448,
    defaultTemperature: 0,
    speedTier: 'fast',
    qualityTier: 'premium',
    isFree: true,
  },

  /** Whisper Large V3 Turbo - Faster STT */
  'whisper-large-v3-turbo': {
    id: 'whisper-large-v3-turbo',
    name: 'Whisper Large V3 Turbo (STT)',
    contextWindow: 448,
    maxOutputTokens: 448,
    defaultTemperature: 0,
    speedTier: 'fast',
    qualityTier: 'premium',
    isFree: true,
  },

  /** Allam 2 7B - Arabic language model */
  'allam-2-7b': {
    id: 'allam-2-7b',
    name: 'Allam 2 7B (Arabic)',
    contextWindow: 4096,
    maxOutputTokens: 4096,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'standard',
    isFree: true,
  },
}

/**
 * Groq Use Case Mappings - Optimized for free tier based on benchmarks
 * 
 * Model Selection Strategy (Benchmarks):
 * - chat: openai/gpt-oss-120b (90% MMLU) → llama-3.3-70b → 8b
 * - analysis: Kimi K2 (262K context) → Qwen 3-32B → GPT-OSS-120B
 * - code-generation: Qwen3-32B (strong coding) → GPT-OSS-120B → llama-3.3-70b
 * - summarization: 8B instant (fast) → GPT-OSS-20B → Scout
 * - extraction: Compound (structured) → llama-3.3-70b → Qwen3-32B
 * - fast-response: 8B instant (fastest at 560 t/s) → GPT-OSS-20B
 * - high-quality: Llama 4 Maverick (creative) → GPT-OSS-120B → llama-4-scout
 * - cost-effective: All are free, prioritize speed/quality balance
 * 
 * Preview models (marked with Preview suffix) may be discontinued without notice.
 * Production-ready models are prioritized for stability.
 */
export const GROQ_USE_CASES: Record<UseCase, UseCaseModelMapping> = {
  chat: {
    primary: 'openai/gpt-oss-120b',
    fallbacks: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful, friendly AI assistant.',
  },
  analysis: {
    primary: 'moonshotai/kimi-k2-instruct-0905',
    fallbacks: ['qwen/qwen3-32b', 'openai/gpt-oss-120b'],
    temperature: 0.3,
    maxTokens: 4096,
    systemPrompt: 'You are an expert analyst. Provide thorough, well-structured analysis.',
  },
  'code-generation': {
    primary: 'qwen/qwen3-32b',
    fallbacks: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile'],
    temperature: 0.2,
    maxTokens: 8192,
    systemPrompt: 'You are an expert programmer. Write clean, well-documented, production-ready code.',
  },
  summarization: {
    primary: 'llama-3.1-8b-instant',
    fallbacks: ['openai/gpt-oss-20b', 'meta-llama/llama-4-scout-17b-16e-instruct'],
    temperature: 0.3,
    maxTokens: 1024,
    systemPrompt: 'You are a concise summarization expert. Provide clear, accurate summaries.',
  },
  extraction: {
    primary: 'groq/compound',
    fallbacks: ['llama-3.3-70b-versatile', 'qwen/qwen3-32b'],
    temperature: 0,
    maxTokens: 2048,
    systemPrompt: 'Extract requested information accurately. Output in specified format.',
  },
  vision: {
    primary: 'llama-3.3-70b-versatile',
    fallbacks: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
    temperature: 0.5,
    maxTokens: 2048,
  },
  'fast-response': {
    primary: 'llama-3.1-8b-instant',
    fallbacks: ['openai/gpt-oss-20b', 'groq/compound'],
    temperature: 0.5,
    maxTokens: 512,
  },
  'high-quality': {
    primary: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    fallbacks: ['openai/gpt-oss-120b', 'moonshotai/kimi-k2-instruct-0905'],
    temperature: 0.7,
    maxTokens: 4096,
  },
  'cost-effective': {
    primary: 'llama-3.1-8b-instant',
    fallbacks: ['openai/gpt-oss-20b', 'llama-3.3-70b-versatile'],
    temperature: 0.7,
    maxTokens: 1024,
  },
}

export const GROQ_CONFIG: ProviderModelConfig = {
  name: 'groq',
  displayName: 'Groq (Free)',
  isFree: true,
  models: GROQ_MODELS,
  useCases: GROQ_USE_CASES,
  defaultModel: 'openai/gpt-oss-120b',
}

// ============================================================================
// Google Gemini Configuration
// ============================================================================

export const GEMINI_MODELS: Record<string, ModelConfig> = {
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'premium',
    isFree: false,
  },
  'gemini-2.0-flash-lite': {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'standard',
    isFree: true, // Free tier available
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    defaultTemperature: 0.7,
    speedTier: 'medium',
    qualityTier: 'premium',
    isFree: false,
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'standard',
    isFree: true, // Free tier available
  },
  'gemini-1.5-flash-8b': {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'basic',
    isFree: true,
  },
  'gemini-2.5-pro-preview': {
    id: 'gemini-2.5-pro-preview',
    name: 'Gemini 2.5 Pro Preview',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    defaultTemperature: 0.7,
    speedTier: 'slow',
    qualityTier: 'premium',
    isFree: false,
  },
  'gemini-2.5-flash-preview': {
    id: 'gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash Preview',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'premium',
    isFree: false,
  },
}

export const GEMINI_USE_CASES: Record<UseCase, UseCaseModelMapping> = {
  chat: {
    primary: 'gemini-2.0-flash',
    fallbacks: ['gemini-1.5-flash', 'gemini-1.5-flash-8b'],
    temperature: 0.7,
    maxTokens: 2048,
  },
  analysis: {
    primary: 'gemini-1.5-pro',
    fallbacks: ['gemini-2.5-pro-preview', 'gemini-2.0-flash'],
    temperature: 0.3,
    maxTokens: 4096,
  },
  'code-generation': {
    primary: 'gemini-2.5-flash-preview',
    fallbacks: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    temperature: 0.2,
    maxTokens: 8192,
  },
  summarization: {
    primary: 'gemini-1.5-flash-8b',
    fallbacks: ['gemini-1.5-flash', 'gemini-2.0-flash-lite'],
    temperature: 0.3,
    maxTokens: 1024,
  },
  extraction: {
    primary: 'gemini-2.0-flash',
    fallbacks: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    temperature: 0,
    maxTokens: 2048,
  },
  vision: {
    primary: 'gemini-2.0-flash',
    fallbacks: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    temperature: 0.5,
    maxTokens: 2048,
  },
  'fast-response': {
    primary: 'gemini-1.5-flash-8b',
    fallbacks: ['gemini-2.0-flash-lite', 'gemini-1.5-flash'],
    temperature: 0.5,
    maxTokens: 512,
  },
  'high-quality': {
    primary: 'gemini-2.5-pro-preview',
    fallbacks: ['gemini-1.5-pro', 'gemini-2.0-flash'],
    temperature: 0.7,
    maxTokens: 4096,
  },
  'cost-effective': {
    primary: 'gemini-1.5-flash-8b',
    fallbacks: ['gemini-2.0-flash-lite', 'gemini-1.5-flash'],
    temperature: 0.7,
    maxTokens: 1024,
  },
}

export const GEMINI_CONFIG: ProviderModelConfig = {
  name: 'gemini',
  displayName: 'Google Gemini',
  isFree: false,
  models: GEMINI_MODELS,
  useCases: GEMINI_USE_CASES,
  defaultModel: 'gemini-2.0-flash',
}

// ============================================================================
// Configuration Registry & Helpers
// ============================================================================

/** All available provider configurations */
export const MODEL_CONFIGS: Record<string, ProviderModelConfig> = {
  groq: GROQ_CONFIG,
  gemini: GEMINI_CONFIG,
}

/** Active configuration - can be switched at runtime */
let activeConfig: ProviderModelConfig = GROQ_CONFIG

/**
 * Get the currently active model configuration
 */
export function getActiveConfig(): ProviderModelConfig {
  return activeConfig
}

/**
 * Switch to a different provider configuration
 */
export function setActiveConfig(providerName: string): void {
  const config = MODEL_CONFIGS[providerName]
  if (!config) {
    throw new Error(`Unknown provider: ${providerName}. Available: ${Object.keys(MODEL_CONFIGS).join(', ')}`)
  }
  activeConfig = config
}

/**
 * Get the best model for a specific use case from the active config
 */
export function getModelForUseCase(useCase: UseCase): UseCaseModelMapping {
  return activeConfig.useCases[useCase]
}

/**
 * Get all available models from the active config
 */
export function getAvailableModels(): ModelConfig[] {
  return Object.values(activeConfig.models)
}

/**
 * Get models filtered by quality tier
 */
export function getModelsByQuality(tier: 'basic' | 'standard' | 'premium'): ModelConfig[] {
  return Object.values(activeConfig.models).filter(m => m.qualityTier === tier)
}

/**
 * Get models filtered by speed tier
 */
export function getModelsBySpeed(tier: 'fast' | 'medium' | 'slow'): ModelConfig[] {
  return Object.values(activeConfig.models).filter(m => m.speedTier === tier)
}

/**
 * Get only free models from the active config
 */
export function getFreeModels(): ModelConfig[] {
  return Object.values(activeConfig.models).filter(m => m.isFree)
}

// ============================================================================
// Agent-Specific Model Recommendations (Groq Free Tier)
// ============================================================================

/**
 * Agent-Specific Model Recommendations (Groq Free Tier)
 * 
 * Based on independent benchmark scores:
 * - GPT-OSS 120B: 90% MMLU, 500 t/s, 96.6% AIME, 93% coding
 * - Llama 3.3 70B: 86% MMLU, 280 t/s, 76% MATH-500, 85% HumanEval
 * - Qwen 3-32B: ~74-75% MMLU, 400 t/s, strong coding
 * - Llama 4 Maverick: beats Claude 3.7 Sonnet, 600 t/s, creative
 * - Llama 4 Scout: 750 t/s, quality/speed balance
 * - Llama 3.1 8B: 560 t/s, $0.05 input, fastest value
 * - Kimi K2: 262K context, 200 t/s
 * - Groq Compound: 450 t/s, agentic tool use
 */
export const AGENT_MODEL_RECOMMENDATIONS = {
  /** Planning and orchestration - needs strong reasoning */
  planner: {
    model: 'openai/gpt-oss-120b',
    reason: 'Best reasoning: 90% MMLU, 500 t/s, 96.6% AIME',
    fallback: 'llama-3.3-70b-versatile',
  },
  
  /** Code generation and modification - best at code */
  coder: {
    model: 'qwen/qwen3-32b',
    reason: 'Strong coding performance: ~74-75% MMLU, 400 t/s',
    fallback: 'openai/gpt-oss-120b',
  },
  
  /** Research and analysis - needs long context */
  researcher: {
    model: 'moonshotai/kimi-k2-instruct-0905',
    reason: '262K context window for long documents, 200 t/s',
    fallback: 'openai/gpt-oss-120b',
  },
  
  /** Quick decisions and routing - fastest production model */
  router: {
    model: 'llama-3.1-8b-instant',
    reason: 'Fastest inference: 560 t/s, $0.05 input, best value',
    fallback: 'openai/gpt-oss-20b',
  },
  
  /** Tool use and function calling - optimized for agentic workflows */
  toolUser: {
    model: 'groq/compound',
    reason: 'Built for agentic tool use with web search and code execution, 450 t/s',
    fallback: 'llama-3.3-70b-versatile',
  },
  
  /** Content generation and writing - creative excellence */
  writer: {
    model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    reason: 'Creative: beats Claude 3.7 Sonnet, 600 t/s',
    fallback: 'openai/gpt-oss-120b',
  },
  
  /** Data extraction and parsing - structured output */
  extractor: {
    model: 'groq/compound',
    reason: 'Optimized for structured extraction with tool use, 450 t/s',
    fallback: 'llama-3.3-70b-versatile',
  },
  
  /** Summarization - needs speed */
  summarizer: {
    model: 'llama-3.1-8b-instant',
    reason: 'Fast and effective: 560 t/s, $0.05 input',
    fallback: 'openai/gpt-oss-20b',
  },
  
  /** Safety and content moderation */
  moderator: {
    model: 'meta-llama/llama-guard-4-12b',
    reason: 'Purpose-built for content safety, 1200 t/s',
    fallback: 'openai/gpt-oss-safeguard-20b',
  },
} as const

export type AgentRole = keyof typeof AGENT_MODEL_RECOMMENDATIONS

// ============================================================================
// EXPORTS FOR MANAGER
// ============================================================================

/** Exported for use in AI Manager */
export const DEFAULT_USE_CASE_MODELS = GROQ_USE_CASES

