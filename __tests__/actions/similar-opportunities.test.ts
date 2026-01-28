import { vi, describe, it, expect, beforeEach } from "vitest"
import { getSimilarOpportunities } from "../../app/actions/similar-opportunities"

const mockRpc = vi.fn()
const mockSupabase = {
  rpc: mockRpc
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(mockSupabase),
  getCurrentUser: () => Promise.resolve({ id: "user_123" })
}))

describe("getSimilarOpportunities", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should call get_similar_opportunities RPC", async () => {
    const mockData = [{ id: "opp_2", title: "Similar Opp" }]
    mockRpc.mockResolvedValueOnce({ data: mockData, error: null })

    const result = await getSimilarOpportunities("opp_1")

    expect(mockRpc).toHaveBeenCalledWith("get_similar_opportunities", {
      opportunity_id: "opp_1",
      match_count: 5
    })
    expect(result).toEqual(mockData)
  })

  it("should return empty array on error", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "RPC Error" } })

    const result = await getSimilarOpportunities("opp_1")

    expect(result).toEqual([])
  })
})
