import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  mockGetCurrentUser,
  mockCreateClient,
  mockRpc,
  mockEnqueueRecommendationRefresh,
  redisState,
  mockRedis,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
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
  getCurrentUser: mockGetCurrentUser,
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

import { GET } from "@/app/api/dashboard/telemetry/route"

const USER_ID = "11111111-1111-1111-1111-111111111111"

const baseCorePayload = {
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
  recommendation: {
    opportunityId: "22222222-2222-2222-2222-222222222222",
    title: "Senior Frontend Engineer",
    organization: "Acme",
    location: "Remote",
    topMatchProbability: 91,
    matchScoreRaw: 91.4,
    matchReasons: ["React", "TypeScript"],
    computedAt: new Date().toISOString(),
  },
}

const staleCachedPayload = {
  ...baseCorePayload,
  meta: {
    generatedAt: new Date(Date.now() - 120_000).toISOString(),
    cacheState: "fresh",
    stale: false,
    ttlSeconds: 60,
  },
}

describe("GET /api/dashboard/telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    redisState.configured = true
    mockCreateClient.mockResolvedValue({ rpc: mockRpc })
    mockGetCurrentUser.mockResolvedValue({ id: USER_ID })
    mockEnqueueRecommendationRefresh.mockResolvedValue(undefined)
    mockRedis.del.mockResolvedValue(1)
  })

  it("returns 401 when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe("UNAUTHORIZED")
  })

  it("returns fresh cache hit and skips DB", async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify(staleCachedPayload))

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.meta.cacheState).toBe("fresh")
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("returns stale cache and triggers revalidation lock path", async () => {
    mockRedis.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(staleCachedPayload))
    mockRedis.set.mockResolvedValueOnce(null)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.meta.cacheState).toBe("stale")
    expect(body.meta.stale).toBe(true)
    expect(mockRedis.set).toHaveBeenCalledWith(
      `dashboard:telemetry:v1:${USER_ID}:lock`,
      "1",
      { nx: true, ex: 15 }
    )
  })

  it("falls back to DB when Redis is unavailable", async () => {
    mockRedis.get.mockRejectedValue(new Error("redis down"))
    mockRpc.mockResolvedValue({ data: baseCorePayload, error: null })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.meta.cacheState).toBe("bypass")
    expect(body.user.id).toBe(USER_ID)
  })

  it("returns stale payload when revalidation DB call errors", async () => {
    mockRedis.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(staleCachedPayload))
    mockRedis.set.mockResolvedValueOnce("OK")
    mockRpc.mockResolvedValue({ data: null, error: { message: "db down" } })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.meta.cacheState).toBe("stale")
    expect(body.meta.stale).toBe(true)
  })

  it("returns 500 when DB errors and no stale exists", async () => {
    mockRedis.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    mockRpc.mockResolvedValue({ data: null, error: { message: "db down" } })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error.code).toBe("DASHBOARD_TELEMETRY_RPC_ERROR")
  })

  it("enqueues recommendation refresh when recommendation cache and DB rec are missing", async () => {
    mockRedis.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    mockRedis.set.mockResolvedValue("OK")
    mockRpc.mockResolvedValue({
      data: {
        ...baseCorePayload,
        recommendation: null,
      },
      error: null,
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.recommendation).toBeNull()
    expect(mockEnqueueRecommendationRefresh).toHaveBeenCalledWith(USER_ID)
  })
})
