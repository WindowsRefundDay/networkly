import { redis, isRedisConfigured } from "./redis"

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
  limit: number
}

/**
 * Check rate limit using sliding window algorithm
 * @param key - Unique identifier (e.g., "profile_view:ip:profileId")
 * @param limit - Maximum number of requests allowed
 * @param windowSeconds - Time window in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000

  // If Redis is not configured, allow all requests (development mode)
  if (!isRedisConfigured || !redis) {
    return {
      success: true,
      remaining: limit,
      reset: Math.ceil(Date.now() / 1000) + windowSeconds,
      limit,
    }
  }

  try {
    // Use a sorted set to track requests with timestamps as scores
    const pipeline = redis.pipeline()
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart)
    
    // Count current entries
    pipeline.zcard(key)
    
    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` })
    
    // Set expiry on the key
    pipeline.expire(key, windowSeconds)
    
    const results = await pipeline.exec()
    
    // Results: [removeResult, countResult, addResult, expireResult]
    const currentCount = (results[1] as number) || 0
    
    const success = currentCount < limit
    const remaining = Math.max(0, limit - currentCount - 1)
    const reset = Math.ceil((windowStart + windowSeconds * 1000) / 1000)

    return {
      success,
      remaining,
      reset,
      limit,
    }
  } catch (error) {
    console.error("[RateLimit] Error checking rate limit:", error)
    // On error, allow the request (fail open)
    return {
      success: true,
      remaining: limit,
      reset: Math.ceil(Date.now() / 1000) + windowSeconds,
      limit,
    }
  }
}

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
  // Profile view: 100 views per hour per IP per profile
  PROFILE_VIEW: {
    limit: 100,
    windowSeconds: 3600, // 1 hour
  },
  // API calls: 1000 requests per hour per user
  API_CALL: {
    limit: 1000,
    windowSeconds: 3600,
  },
  // Profile updates: 30 per hour
  PROFILE_UPDATE: {
    limit: 30,
    windowSeconds: 3600,
  },
} as const

/**
 * Helper to create rate limit keys
 */
export function createRateLimitKey(
  type: keyof typeof RATE_LIMITS,
  ...identifiers: string[]
): string {
  return `ratelimit:${type.toLowerCase()}:${identifiers.join(":")}`
}
