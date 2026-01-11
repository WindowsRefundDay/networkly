/**
 * Retry Utility - Exponential backoff with jitter
 */

import { AIProviderError, type ProviderName } from '../types'
import { logger } from './logger'

export interface RetryOptions {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterFactor: number
  retryableStatuses: number[]
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
}

function calculateDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay = Math.min(
    options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt),
    options.maxDelayMs
  )
  
  // Add jitter to prevent thundering herd
  const jitter = exponentialDelay * options.jitterFactor * (Math.random() * 2 - 1)
  return Math.max(0, exponentialDelay + jitter)
}

function isRetryable(error: unknown, options: RetryOptions): boolean {
  if (error instanceof AIProviderError) {
    return error.retryable
  }

  if (error instanceof Error && 'status' in error) {
    const status = (error as { status: number }).status
    return options.retryableStatuses.includes(status)
  }

  // Network errors are generally retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }

  return false
}

export async function withRetry<T>(
  provider: ProviderName,
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (!isRetryable(error, opts) || attempt === opts.maxRetries) {
        throw error
      }

      // Check for retry-after header hint
      let delay = calculateDelay(attempt, opts)
      if (error instanceof AIProviderError && error.retryAfter) {
        delay = Math.max(delay, error.retryAfter * 1000)
      }

      logger.retry(provider, attempt + 1, opts.maxRetries, lastError.message)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Circuit breaker state
interface CircuitState {
  failures: number
  lastFailure: number
  state: 'closed' | 'open' | 'half-open'
}

export class CircuitBreaker {
  private circuits: Map<string, CircuitState> = new Map()
  private failureThreshold: number = 5
  private recoveryTimeMs: number = 30000
  private halfOpenMaxAttempts: number = 3

  private getCircuit(key: string): CircuitState {
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        failures: 0,
        lastFailure: 0,
        state: 'closed',
      })
    }
    return this.circuits.get(key)!
  }

  isOpen(provider: ProviderName, model?: string): boolean {
    const key = model ? `${provider}:${model}` : provider
    const circuit = this.getCircuit(key)

    if (circuit.state === 'open') {
      // Check if we should transition to half-open
      if (Date.now() - circuit.lastFailure > this.recoveryTimeMs) {
        circuit.state = 'half-open'
        logger.debug('CircuitBreaker', `Circuit half-open for ${key}`)
        return false
      }
      return true
    }

    return false
  }

  recordSuccess(provider: ProviderName, model?: string) {
    const key = model ? `${provider}:${model}` : provider
    const circuit = this.getCircuit(key)
    
    if (circuit.state === 'half-open' || circuit.state === 'closed') {
      circuit.failures = 0
      circuit.state = 'closed'
    }
  }

  recordFailure(provider: ProviderName, model?: string) {
    const key = model ? `${provider}:${model}` : provider
    const circuit = this.getCircuit(key)
    
    circuit.failures++
    circuit.lastFailure = Date.now()

    if (circuit.failures >= this.failureThreshold) {
      circuit.state = 'open'
      logger.warn('CircuitBreaker', `Circuit opened for ${key}`, { failures: circuit.failures })
    }
  }

  getState(provider: ProviderName, model?: string): CircuitState {
    const key = model ? `${provider}:${model}` : provider
    return this.getCircuit(key)
  }
}

export const circuitBreaker = new CircuitBreaker()
