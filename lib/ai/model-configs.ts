/**
 * AI Model Configurations - STRICT GEMINI 2.5 FLASH ONLY
 */

import type { UseCase } from './types'

// ============================================================================
// Model Configuration Types
// ============================================================================

export interface ModelConfig {
  id: string
  name: string
  contextWindow: number
  maxOutputTokens: number
  defaultTemperature?: number
  speedTier: 'fast' | 'medium' | 'slow'
  qualityTier: 'basic' | 'standard' | 'premium'
  isFree: boolean
}

export interface UseCaseModelMapping {
  primary: string
  fallbacks: string[]
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

export interface ProviderModelConfig {
  name: string
  displayName: string
  isFree: boolean
  models: Record<string, ModelConfig>
  useCases: Record<UseCase, UseCaseModelMapping>
  defaultModel: string
}

// ============================================================================
// STRICT GEMINI 2.5 FLASH CONFIGURATION
// ============================================================================

// HARDCODED SINGLE MODEL
const STRICT_MODEL_ID = 'gemini-2.5-flash'

export const GEMINI_MODELS: Record<string, ModelConfig> = {
  [STRICT_MODEL_ID]: {
    id: STRICT_MODEL_ID,
    name: 'Gemini 2.5 Flash',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    defaultTemperature: 0.7,
    speedTier: 'fast',
    qualityTier: 'standard',
    isFree: false,
  },
}

// Helper to create strict single-model config
const createStrictMapping = (temp: number = 0.7, tokens: number = 2048): UseCaseModelMapping => ({
  primary: STRICT_MODEL_ID,
  fallbacks: [], // NO FALLBACKS
  temperature: temp,
  maxTokens: tokens,
})

export const GEMINI_USE_CASES: Record<UseCase, UseCaseModelMapping> = {
  chat: createStrictMapping(0.7, 2048),
  analysis: createStrictMapping(0.3, 4096),
  'code-generation': createStrictMapping(0.2, 8192),
  summarization: createStrictMapping(0.3, 1024),
  extraction: createStrictMapping(0, 2048),
  vision: createStrictMapping(0.5, 2048),
  'fast-response': createStrictMapping(0.5, 512),
  'high-quality': createStrictMapping(0.7, 4096),
  'cost-effective': createStrictMapping(0.7, 1024),
}

export const GEMINI_CONFIG: ProviderModelConfig = {
  name: 'gemini',
  displayName: 'Google Gemini (Strict 2.5 Flash)',
  isFree: false,
  models: GEMINI_MODELS,
  useCases: GEMINI_USE_CASES,
  defaultModel: STRICT_MODEL_ID,
}

// ============================================================================
// OpenRouter Configuration - DISABLED/IGNORED IN THIS MODE
// ============================================================================

export const OPENROUTER_MODELS = GEMINI_MODELS
export const OPENROUTER_USE_CASES = GEMINI_USE_CASES
export const OPENROUTER_CONFIG = GEMINI_CONFIG

// ============================================================================
// Hybrid Configuration - FORCED TO GEMINI
// ============================================================================

export const HYBRID_USE_CASES = GEMINI_USE_CASES
export const HYBRID_CONFIG = GEMINI_CONFIG

// ============================================================================
// Configuration Registry
// ============================================================================

export const MODEL_CONFIGS: Record<string, ProviderModelConfig> = {
  gemini: GEMINI_CONFIG,
  openrouter: GEMINI_CONFIG, // Force Gemini
  hybrid: GEMINI_CONFIG,     // Force Gemini
}

let activeConfig: ProviderModelConfig = GEMINI_CONFIG

export function getActiveConfig(): ProviderModelConfig { return activeConfig }
export function setActiveConfig(providerName: string): void { activeConfig = GEMINI_CONFIG } // Ignore requests to switch
export function getModelForUseCase(useCase: UseCase): UseCaseModelMapping { return activeConfig.useCases[useCase] }
export function getAvailableModels(): ModelConfig[] { return Object.values(activeConfig.models) }
export function getModelsByQuality(tier: any): ModelConfig[] { return Object.values(activeConfig.models) }
export function getModelsBySpeed(tier: any): ModelConfig[] { return Object.values(activeConfig.models) }
export function getFreeModels(): ModelConfig[] { return Object.values(activeConfig.models) }

// ============================================================================
// Agent-Specific Model Recommendations
// ============================================================================

const STRICT_RECOMMENDATION = {
  model: STRICT_MODEL_ID,
  reason: 'Strict enforcement of gemini-2.5-flash',
  fallback: STRICT_MODEL_ID,
}

export const AGENT_MODEL_RECOMMENDATIONS = {
  planner: STRICT_RECOMMENDATION,
  coder: STRICT_RECOMMENDATION,
  researcher: STRICT_RECOMMENDATION,
  router: STRICT_RECOMMENDATION,
  toolUser: STRICT_RECOMMENDATION,
  writer: STRICT_RECOMMENDATION,
  extractor: STRICT_RECOMMENDATION,
  summarizer: STRICT_RECOMMENDATION,
  moderator: STRICT_RECOMMENDATION,
} as const

export type AgentRole = keyof typeof AGENT_MODEL_RECOMMENDATIONS
export const DEFAULT_USE_CASE_MODELS = GEMINI_USE_CASES
