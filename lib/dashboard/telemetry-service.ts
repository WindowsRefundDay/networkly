import { createClient } from "@/lib/supabase/server"
import { isRedisConfigured, redis } from "@/lib/redis"
import {
  DashboardRecommendationSchema,
  DashboardTelemetryCoreSchema,
  DashboardTelemetryResponseSchema,
  type DashboardTelemetryCore,
  type DashboardTelemetryResponse,
} from "@/lib/dashboard/telemetry-schema"
import { enqueueRecommendationRefresh } from "@/lib/dashboard/recommendation-queue"

type CacheState = "fresh" | "stale" | "bypass"

const FRESH_TTL_SECONDS = 60
const STALE_TTL_SECONDS = 300
const LOCK_TTL_SECONDS = 15

export class DashboardTelemetryError extends Error {
  code: "NOT_FOUND" | "RPC_ERROR" | "INVALID_PAYLOAD"
  constructor(code: "NOT_FOUND" | "RPC_ERROR" | "INVALID_PAYLOAD", message: string) {
    super(message)
    this.code = code
  }
}

function keyFresh(userId: string) {
  return `dashboard:telemetry:v1:${userId}:fresh`
}

function keyStale(userId: string) {
  return `dashboard:telemetry:v1:${userId}:stale`
}

function keyLock(userId: string) {
  return `dashboard:telemetry:v1:${userId}:lock`
}

function keyRecommendation(userId: string) {
  return `dashboard:recommendation:v1:${userId}`
}

function withMeta(payload: DashboardTelemetryCore, cacheState: CacheState, stale: boolean): DashboardTelemetryResponse {
  const validated = DashboardTelemetryResponseSchema.parse({
    ...payload,
    meta: {
      generatedAt: new Date().toISOString(),
      cacheState,
      stale,
      ttlSeconds: FRESH_TTL_SECONDS,
    },
  })

  return validated
}

function parseCachedPayload(raw: unknown): DashboardTelemetryResponse | null {
  if (!raw) return null

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    const result = DashboardTelemetryResponseSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

async function fetchRpcPayload(userId: string): Promise<DashboardTelemetryCore> {
  const supabase = await createClient()

  const { data, error } = await (supabase.rpc as any)("get_dashboard_telemetry", {
    p_user_id: userId,
  })

  if (error) {
    throw new DashboardTelemetryError("RPC_ERROR", error.message || "Dashboard telemetry RPC failed")
  }

  if (!data) {
    throw new DashboardTelemetryError("NOT_FOUND", "Dashboard telemetry not found for user")
  }

  const parsed = DashboardTelemetryCoreSchema.safeParse(data)
  if (!parsed.success) {
    throw new DashboardTelemetryError("INVALID_PAYLOAD", "Dashboard telemetry payload failed validation")
  }

  return parsed.data
}

function isMissingDashboardTelemetryRpc(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "")
  return message.includes("get_dashboard_telemetry") && message.includes("schema cache")
}

function normalizeToDayStart(input: string): Date {
  const date = new Date(input)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfLast7Days(): Date {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)
}

async function fetchFallbackPayload(userId: string): Promise<DashboardTelemetryCore> {
  const supabase = await createClient()
  const since = startOfLast7Days()

  const [
    userResult,
    matchesResult,
    unreadMessagesResult,
    pendingRequestsResult,
    newConnectionsResult,
    analyticsResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, is_profile_complete, search_appearances")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_opportunities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "curated"),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("unread", true),
    supabase
      .from("connections")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("status", "pending"),
    supabase
      .from("connections")
      .select("connected_date")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "accepted")
      .not("connected_date", "is", null),
    supabase
      .from("analytics_data")
      .select("profile_views")
      .eq("user_id", userId)
      .maybeSingle(),
  ])

  if (userResult.error) {
    throw new DashboardTelemetryError("RPC_ERROR", userResult.error.message || "Failed to load dashboard user data")
  }

  if (!userResult.data) {
    throw new DashboardTelemetryError("NOT_FOUND", "Dashboard telemetry not found for user")
  }

  const analyticsRaw = (analyticsResult.data as { profile_views?: Array<{ date?: string; views?: number }> } | null)
    ?.profile_views

  const profileViews7d = Array.isArray(analyticsRaw)
    ? analyticsRaw.reduce((sum, point) => {
        if (!point?.date || typeof point.views !== "number") return sum
        return normalizeToDayStart(point.date) >= since ? sum + Math.max(0, Math.floor(point.views)) : sum
      }, 0)
    : 0

  const newConnections7d = (newConnectionsResult.data || []).reduce((sum, row) => {
    if (!row.connected_date) return sum
    return normalizeToDayStart(row.connected_date) >= since ? sum + 1 : sum
  }, 0)

  const payload: DashboardTelemetryCore = {
    user: {
      id: userResult.data.id,
      name: userResult.data.name || "User",
      profileCompleteness: userResult.data.is_profile_complete ? 100 : 60,
      searchAppearancesTotal: Math.max(0, userResult.data.search_appearances || 0),
    },
    monumentalMetrics: {
      matches: Math.max(0, matchesResult.count || 0),
      unreadMessages: Math.max(0, unreadMessagesResult.count || 0),
      pendingRequests: Math.max(0, pendingRequestsResult.count || 0),
    },
    weeklyTelemetry: {
      profileViews7d,
      newConnections7d,
    },
    recommendation: null,
  }

  const parsed = DashboardTelemetryCoreSchema.safeParse(payload)
  if (!parsed.success) {
    throw new DashboardTelemetryError("INVALID_PAYLOAD", "Fallback dashboard telemetry payload failed validation")
  }

  return parsed.data
}

async function fetchPrimaryPayload(userId: string): Promise<DashboardTelemetryCore> {
  try {
    return await fetchRpcPayload(userId)
  } catch (error) {
    if (!isMissingDashboardTelemetryRpc(error)) {
      throw error
    }
    return fetchFallbackPayload(userId)
  }
}

async function fetchWorkerRecommendation(userId: string): Promise<DashboardTelemetryCore["recommendation"] | null> {
  if (!isRedisConfigured || !redis) return null

  try {
    const raw = await redis.get(keyRecommendation(userId))
    if (!raw) return null

    const parsedRaw = typeof raw === "string" ? JSON.parse(raw) : raw
    const parsed = DashboardRecommendationSchema.safeParse(parsedRaw)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function mergeRecommendation(
  payload: DashboardTelemetryCore,
  workerRecommendation: DashboardTelemetryCore["recommendation"] | null
): DashboardTelemetryCore {
  if (workerRecommendation) {
    return {
      ...payload,
      recommendation: workerRecommendation,
    }
  }

  if (!payload.recommendation) {
    void enqueueRecommendationRefresh(payload.user.id).catch(() => {
      // fail-open: async refresh is best effort
    })
  }

  return payload
}

async function saveCache(userId: string, payload: DashboardTelemetryResponse) {
  if (!isRedisConfigured || !redis) return

  const stringified = JSON.stringify(payload)
  await Promise.all([
    redis.set(keyFresh(userId), stringified, { ex: FRESH_TTL_SECONDS }),
    redis.set(keyStale(userId), stringified, { ex: STALE_TTL_SECONDS }),
  ])
}

async function tryRevalidate(userId: string, log: (msg: string, meta?: unknown) => void) {
  if (!isRedisConfigured || !redis) return

  try {
    const lock = await redis.set(keyLock(userId), "1", { nx: true, ex: LOCK_TTL_SECONDS })
    if (!lock) return

    try {
      const rpcPayload = await fetchPrimaryPayload(userId)
      const workerRec = await fetchWorkerRecommendation(userId)
      const merged = mergeRecommendation(rpcPayload, workerRec)
      const freshPayload = withMeta(merged, "fresh", false)
      await saveCache(userId, freshPayload)
    } finally {
      await redis.del(keyLock(userId))
    }
  } catch (error) {
    log("background revalidation failed", error)
  }
}

export async function getDashboardTelemetry(userId: string): Promise<DashboardTelemetryResponse> {
  let staleCachedPayload: DashboardTelemetryResponse | null = null
  let redisFailureLogged = false

  const logRedisFailure = (error: unknown) => {
    if (redisFailureLogged) return
    redisFailureLogged = true
    console.error("[dashboard:telemetry] redis unavailable, bypassing cache", error)
  }

  const logRevalidateFailure = (msg: string, meta?: unknown) => {
    console.error(`[dashboard:telemetry] ${msg}`, meta)
  }

  const bypassState = !isRedisConfigured || !redis

  if (!bypassState) {
    try {
      const freshRaw = await redis.get(keyFresh(userId))
      const freshPayload = parseCachedPayload(freshRaw)
      if (freshPayload) {
        return DashboardTelemetryResponseSchema.parse({
          ...freshPayload,
          meta: {
            ...freshPayload.meta,
            cacheState: "fresh",
            stale: false,
            ttlSeconds: FRESH_TTL_SECONDS,
          },
        })
      }

      const staleRaw = await redis.get(keyStale(userId))
      staleCachedPayload = parseCachedPayload(staleRaw)
      if (staleCachedPayload) {
        void tryRevalidate(userId, logRevalidateFailure)
        return DashboardTelemetryResponseSchema.parse({
          ...staleCachedPayload,
          meta: {
            ...staleCachedPayload.meta,
            cacheState: "stale",
            stale: true,
            ttlSeconds: FRESH_TTL_SECONDS,
          },
        })
      }
    } catch (error) {
      logRedisFailure(error)
    }
  }

  try {
    const rpcPayload = await fetchPrimaryPayload(userId)
    const workerRec = await fetchWorkerRecommendation(userId)
    const merged = mergeRecommendation(rpcPayload, workerRec)
    const cacheState: CacheState = bypassState || redisFailureLogged ? "bypass" : "fresh"
    const result = withMeta(merged, cacheState, false)

    if (!bypassState && !redisFailureLogged) {
      try {
        await saveCache(userId, result)
      } catch (error) {
        logRedisFailure(error)
      }
    }

    return result
  } catch (error) {
    if (staleCachedPayload) {
      return DashboardTelemetryResponseSchema.parse({
        ...staleCachedPayload,
        meta: {
          ...staleCachedPayload.meta,
          cacheState: "stale",
          stale: true,
          ttlSeconds: FRESH_TTL_SECONDS,
        },
      })
    }

    throw error
  }
}
