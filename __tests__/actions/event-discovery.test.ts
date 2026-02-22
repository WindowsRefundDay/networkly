import { vi, describe, it, expect, beforeEach } from "vitest"
import { discoverEvents } from "../../app/actions/event-discovery"

// Mock fetch global
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock process.env
process.env.SCRAPER_API_URL = "http://mock-scraper:8080"
process.env.DISCOVERY_API_TOKEN = "mock-token"

describe("discoverEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return error if query is too short", async () => {
    const result = await discoverEvents("ab", { locationType: "all" })
    expect(result.success).toBe(false)
    expect(result.message).toContain("too short")
  })

  it("should call scraper API with correct params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 5, results: [] }),
    })

    const result = await discoverEvents("hackathon", { locationType: "online", topic: "AI" })

    expect(mockFetch).toHaveBeenCalledWith(
      "http://mock-scraper:8080/api/v1/search",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("hackathon AI virtual online"),
        headers: expect.objectContaining({
          "Authorization": "Bearer mock-token"
        })
      })
    )

    expect(result.success).toBe(true)
    expect(result.count).toBe(5)
  })

  it("should handle scraper API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error"
    })

    const result = await discoverEvents("hackathon", { locationType: "all" })

    expect(result.success).toBe(false)
    expect(result.message).toContain("unavailable")
  })

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const result = await discoverEvents("hackathon", { locationType: "all" })

    expect(result.success).toBe(false)
    expect(result.message).toContain("failed")
  })
})
