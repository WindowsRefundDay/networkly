import { vi, describe, it, expect, beforeEach } from "vitest"
import { discoverOpportunitiesForProject } from "../../app/actions/goal-discovery"

// Mock dependencies
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

const mockSupabase = {
  from: mockFrom.mockReturnValue({
    select: mockSelect.mockReturnValue({
      eq: mockEq.mockReturnValue({
        single: mockSingle
      })
    })
  })
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(mockSupabase),
  getCurrentUser: () => Promise.resolve({ id: "user_123" })
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("discoverOpportunitiesForProject", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chain
    mockFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle
          })
        })
      })
  })

  it("should fetch project details and call scraper API", async () => {
    // Mock project fetch
    mockSingle.mockResolvedValueOnce({
      data: {
        title: "AI Researcher",
        description: "Building a new LLM",
        tags: ["AI", "Python"],
        category: "Research",
        looking_for: ["Developer"]
      },
      error: null
    })

    // Mock scraper response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 3, results: [] })
    })

    const result = await discoverOpportunitiesForProject("proj_123")

    expect(mockFrom).toHaveBeenCalledWith("projects")
    expect(mockEq).toHaveBeenCalledWith("id", "proj_123")
    
    // Check scraper call
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/search"),
      expect.objectContaining({
        body: expect.stringContaining("AI Researcher Research AI Python")
      })
    )

    expect(result.success).toBe(true)
  })

  it("should fail if project not found", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" }
    })

    const result = await discoverOpportunitiesForProject("proj_invalid")

    expect(result.success).toBe(false)
    expect(result.message).toContain("Project not found")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
