/**
 * Retry Utility - Basic retry logic
 */

import { logger } from "@/lib/ai/utils/logger"

type ProviderName = string

export async function withRetry<T>(
  provider: ProviderName,
  operation: () => Promise<T>,
  retries = 3
): Promise<T> {
  let lastError: any

  for (let i = 0; i < retries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const isLastAttempt = i === retries - 1

      if (isLastAttempt) break

      const delay = Math.pow(2, i) * 1000
      logger.warn('Retry', `Attempt ${i + 1} failed for ${provider}`, { error: String(error) })
      await new Promise(r => setTimeout(r, delay))
    }
  }

  throw lastError
}
