import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  mockCreateClient,
  mockRpc,
  mockEnqueueRecommendationRefresh,
  redisState,
  mockRedis,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockRpc: vi.fn(),
  mockEnqueueRecommendationRefresh: vi.fn(),
  redisState: { configured: true },
  mockRedis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}))

vi.mock("@/lib/redis", () => ({
  get isRedisConfigured() {
    return redisState.configured
  },
  get redis() {
    return redisState.configured ? mockRedis : null
  },
}))

vi.mock("@/lib/dashboard/recommendation-queue", () => ({
  enqueueRecommendationRefresh: mockEnqueueRecommendationRefresh,
}))

import { DashboardTelemetryError, getDashboardTelemetry } from "@/lib/dashboard/telemetry-service"

const USER_ID = "11111111-1111-1111-1111-111111111111"

const staleCachedPayload = {
  user: {
    id: USER_ID,
    name: "Test User",
    profileCompleteness: 80,
    searchAppearancesTotal: 42,
  },
  monumentalMetrics: {
    matches: 12,
    unreadMessages: 3,
    pendingRequests: 2,
  },
  weeklyTelemetry: {
    profileViews7d: 19,
    newConnections7d: 4,
  },
  recommendation: null,
  meta: {
    generatedAt: new Date(Date.now() - 120_000).toISOString(),
    cacheState: "fresh",
    stale: false,
    ttlSeconds: 60,
  },
}

describe("dashboard telemetry service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    redisState.configured = true
    mockCreateClient.mockResolvedValue({ rpc: mockRpc })
    mockEnqueueRecommendationRefresh.mockResolvedValue(undefined)
  })

  it("uses lock to prevent revalidation stampede", async () => {
    mockRedis.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(staleCachedPayload))
    mockRedis.set.mockResolvedValueOnce(null)

    const result = await getDashboardTelemetry(USER_ID)

    expect(result.meta.cacheState).toBe("stale")
    expect(mockRedis.set).toHaveBeenCalledWith(
      `dashboard:telemetry:v1:${USER_ID}:lock`,
      "1",
      { nx: true, ex: 15 }
    )
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("rejects malformed DB payload with validation error", async () => {
    redisState.configured = false
    mockRpc.mockResolvedValue({
      data: {
        user: { id: USER_ID },
      },
      error: null,
    })

    await expect(getDashboardTelemetry(USER_ID)).rejects.toMatchObject<Partial<DashboardTelemetryError>>({
      code: "INVALID_PAYLOAD",
    })
  })
})
