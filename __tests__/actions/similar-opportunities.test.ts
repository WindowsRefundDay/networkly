import { vi, describe, it, expect, beforeEach } from "vitest"
import { getSimilarOpportunities } from "../../app/actions/similar-opportunities"

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe("getSimilarOpportunities", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SCRAPER_API_URL = "http://localhost:8080"
    process.env.DISCOVERY_API_TOKEN = "test_token"
  })

  it("should call scraper API for similar opportunities", async () => {
    const mockData = { similar: [{ id: "opp_2", title: "Similar Opp" }] }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData)
    })

    const result = await getSimilarOpportunities("opp_1")

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/opportunities/opp_1/similar?limit=5",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json"
        })
      })
    )
    expect(result).toEqual(mockData.similar)
  })

  it("should return empty array on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    const result = await getSimilarOpportunities("opp_1")

    expect(result).toEqual([])
  })

  it("should return empty array on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const result = await getSimilarOpportunities("opp_1")

    expect(result).toEqual([])
  })
})
