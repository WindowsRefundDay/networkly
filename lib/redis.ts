import { Redis } from '@upstash/redis'

// Redis is optional for development - rate limiting will gracefully degrade
const hasRedisConfig = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

if (!hasRedisConfig) {
    console.warn('⚠️  Redis not configured. Rate limiting disabled in development.')
}

export const redis = hasRedisConfig
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    : null

export const isRedisConfigured = hasRedisConfig
