/**
 * Rate Limiter - Token bucket implementation with sliding window
 */

import type { RateLimitConfig, RateLimitState, ProviderName } from '../types'
import { RateLimitError } from '../types'
import { logger } from './logger'

interface RateLimitBucket {
  requests: number[]
  tokens: number[]
  config: RateLimitConfig
}

export class RateLimiter {
  private buckets: Map<string, RateLimitBucket> = new Map()
  private windowMs: number = 60000 // 1 minute sliding window

  configure(provider: ProviderName, config: RateLimitConfig) {
    this.buckets.set(provider, {
      requests: [],
      tokens: [],
      config,
    })
    logger.debug('RateLimiter', `Configured rate limits for ${provider}`, { ...config })
  }

  private cleanOldEntries(entries: number[]): number[] {
    const cutoff = Date.now() - this.windowMs
    return entries.filter((timestamp) => timestamp > cutoff)
  }

  getState(provider: ProviderName): RateLimitState {
    const bucket = this.buckets.get(provider)
    if (!bucket) {
      return {
        requestsRemaining: Infinity,
        tokensRemaining: Infinity,
        resetTime: new Date(Date.now() + this.windowMs),
      }
    }

    const now = Date.now()
    bucket.requests = this.cleanOldEntries(bucket.requests)
    bucket.tokens = this.cleanOldEntries(bucket.tokens)

    const requestsUsed = bucket.requests.length
    const tokensUsed = bucket.tokens.reduce((sum, t) => sum + t, 0)

    return {
      requestsRemaining: Math.max(0, bucket.config.requestsPerMinute - requestsUsed),
      tokensRemaining: Math.max(0, bucket.config.tokensPerMinute - tokensUsed),
      resetTime: new Date(now + this.windowMs),
    }
  }

  async checkAndConsume(
    provider: ProviderName,
    estimatedTokens: number = 1000
  ): Promise<void> {
    const bucket = this.buckets.get(provider)
    if (!bucket) return // No rate limit configured

    const now = Date.now()
    bucket.requests = this.cleanOldEntries(bucket.requests)
    bucket.tokens = this.cleanOldEntries(bucket.tokens)

    const requestsUsed = bucket.requests.length
    const tokensUsed = bucket.tokens.reduce((sum) => sum + 1, 0)

    // Check request limit
    if (requestsUsed >= bucket.config.requestsPerMinute) {
      const oldestRequest = bucket.requests[0] || now
      const retryAfter = Math.ceil((oldestRequest + this.windowMs - now) / 1000)
      logger.rateLimit(provider, retryAfter)
      throw new RateLimitError(provider, retryAfter)
    }

    // Check token limit (estimated)
    if (tokensUsed + estimatedTokens > bucket.config.tokensPerMinute) {
      const oldestToken = bucket.tokens[0] || now
      const retryAfter = Math.ceil((oldestToken + this.windowMs - now) / 1000)
      logger.rateLimit(provider, retryAfter)
      throw new RateLimitError(provider, retryAfter)
    }

    // Consume
    bucket.requests.push(now)
  }

  recordTokenUsage(provider: ProviderName, tokens: number) {
    const bucket = this.buckets.get(provider)
    if (!bucket) return

    const now = Date.now()
    // Store token count with timestamp for accurate tracking
    for (let i = 0; i < tokens; i++) {
      bucket.tokens.push(now)
    }
  }

  // Wait until rate limit resets
  async waitForAvailability(provider: ProviderName): Promise<void> {
    const state = this.getState(provider)
    if (state.requestsRemaining > 0 && state.tokensRemaining > 0) {
      return
    }

    const waitTime = state.resetTime.getTime() - Date.now()
    if (waitTime > 0) {
      logger.debug('RateLimiter', `Waiting ${waitTime}ms for rate limit reset`, { provider })
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }
}

export const rateLimiter = new RateLimiter()
