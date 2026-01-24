/**
 * AI Model Configurations - Modular provider configs for different use cases
 * 
 * This file defines model configurations for Gemini (Google) models.
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
// Google Gemini Configuration - STABLE 2.5 MODELS ONLY
// ============================================================================

export const GEMINI_MODELS: Record<string, ModelConfig> = {
  'gemini-3-pro-preview': {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    defaultTemperature: 0.7,
    speedTier: 'medium',
    qualityTier: 'premium',
    isFree: false,
  },
  'gemini-3-flash-preview': {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'premium',
    isFree: false,
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    defaultTemperature: 0.7,
    speedTier: 'medium',
    qualityTier: 'premium',
    isFree: false,
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'premium',
    isFree: false,
  },
  'gemini-2.5-flash-lite': {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'standard',
    isFree: false,
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'standard',
    isFree: false,
  },
}

export const GEMINI_USE_CASES: Record<UseCase, UseCaseModelMapping> = {
  chat: {
    primary: 'gemini-2.5-flash-lite',
    fallbacks: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-pro'],
    temperature: 0.7,
    maxTokens: 2048,
  },
  analysis: {
    primary: 'gemini-3-flash-preview',
    fallbacks: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'],
    temperature: 0.3,
    maxTokens: 4096,
  },
  'code-generation': {
    primary: 'gemini-3-flash-preview',
    fallbacks: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'],
    temperature: 0.2,
    maxTokens: 8192,
  },
  summarization: {
    primary: 'gemini-2.5-flash-lite',
    fallbacks: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-pro'],
    temperature: 0.3,
    maxTokens: 1024,
  },
  extraction: {
    primary: 'gemini-2.5-flash-lite',
    fallbacks: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-pro'],
    temperature: 0,
    maxTokens: 2048,
  },
  vision: {
    primary: 'gemini-2.5-flash-lite',
    fallbacks: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-pro'],
    temperature: 0.5,
    maxTokens: 2048,
  },
  'fast-response': {
    primary: 'gemini-2.5-flash-lite',
    fallbacks: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-3-flash-preview'],
    temperature: 0.5,
    maxTokens: 512,
  },
  'high-quality': {
    primary: 'gemini-3-flash-preview',
    fallbacks: ['gemini-3-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'],
    temperature: 0.7,
    maxTokens: 4096,
  },
  'cost-effective': {
    primary: 'gemini-2.5-flash-lite',
    fallbacks: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-3-flash-preview'],
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
  defaultModel: 'gemini-2.5-flash-lite',
}

// ============================================================================
// Configuration Registry & Helpers
// ============================================================================

/** All available provider configurations */
export const MODEL_CONFIGS: Record<string, ProviderModelConfig> = {
  gemini: GEMINI_CONFIG,
}

/** Active configuration - can be switched at runtime */
let activeConfig: ProviderModelConfig = GEMINI_CONFIG

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
// Agent-Specific Model Recommendations (Gemini)
// ============================================================================

/**
 * Agent-Specific Model Recommendations (Gemini)
 * 
 * Based on latest Gemini model capabilities:
 * - gemini-3-pro-preview: Best quality, complex reasoning
 * - gemini-3-flash-preview: Fast, high quality, great balance
 * - gemini-2.5-flash-lite: Most cost-effective, fast
 * - gemini-2.5-flash: Fast, high quality, great balance
 * - gemini-2.5-pro: Best quality, 1M context, strong reasoning
 */
export const AGENT_MODEL_RECOMMENDATIONS = {
  /** Planning and orchestration - needs strong reasoning */
  planner: {
    model: 'gemini-3-flash-preview',
    reason: 'Best reasoning and planning capabilities',
    fallback: 'gemini-2.5-pro',
  },
  
  /** Code generation and modification - best at code */
  coder: {
    model: 'gemini-3-flash-preview',
    reason: 'Strong coding with fast response times',
    fallback: 'gemini-2.5-flash',
  },
  
  /** Research and analysis - needs long context */
  researcher: {
    model: 'gemini-3-flash-preview',
    reason: '1M context window for long documents',
    fallback: 'gemini-2.5-pro',
  },
  
  /** Quick decisions and routing - fastest production model */
  router: {
    model: 'gemini-2.5-flash-lite',
    reason: 'Fast inference for quick decisions',
    fallback: 'gemini-2.5-flash',
  },
  
  /** Tool use and function calling - optimized for agentic workflows */
  toolUser: {
    model: 'gemini-2.5-flash-lite',
    reason: 'Excellent function calling support',
    fallback: 'gemini-3-flash-preview',
  },
  
  /** Content generation and writing - creative excellence */
  writer: {
    model: 'gemini-3-flash-preview',
    reason: 'Best quality for creative writing',
    fallback: 'gemini-2.5-pro',
  },
  
  /** Data extraction and parsing - structured output */
  extractor: {
    model: 'gemini-2.5-flash-lite',
    reason: 'Fast structured extraction',
    fallback: 'gemini-2.5-flash',
  },
  
  /** Summarization - needs speed */
  summarizer: {
    model: 'gemini-2.5-flash-lite',
    reason: 'Fast and effective summarization',
    fallback: 'gemini-2.5-flash',
  },
  
  /** Safety and content moderation */
  moderator: {
    model: 'gemini-2.5-flash-lite',
    reason: 'Built-in safety features',
    fallback: 'gemini-2.5-flash',
  },
} as const

export type AgentRole = keyof typeof AGENT_MODEL_RECOMMENDATIONS

// ============================================================================
// EXPORTS FOR MANAGER
// ============================================================================

/** Exported for use in AI Manager */
export const DEFAULT_USE_CASE_MODELS = GEMINI_USE_CASES

