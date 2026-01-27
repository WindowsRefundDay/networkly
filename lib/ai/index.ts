/**
 * AI Integration Layer
 * 
 * Simplified architecture strictly enforcing Gemini 2.5 Flash on Vertex AI.
 * Replaces the previous "AI Manager" pattern.
 */

// Main Manager
export { googleAI, GoogleModelManager, type Message, type Role } from './google-model-manager'

// Types (Subset that matters)
export type {
  CompletionResult,
  StreamChunk,
} from './types'

// Utilities
export { logger } from './utils/logger'
