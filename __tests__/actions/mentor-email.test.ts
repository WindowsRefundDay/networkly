import { vi, describe, it, expect, beforeEach } from "vitest"
import { generateMentorEmail } from "../../app/actions/mentor-email"

// Mock dependencies
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockContains = vi.fn()

const mockSupabase = {
  from: mockFrom
}

const mockChain = {
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  contains: mockContains
}

mockFrom.mockReturnValue(mockChain)
mockSelect.mockReturnValue(mockChain)
mockEq.mockReturnValue(mockChain)
mockContains.mockReturnValue(mockChain)

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(mockSupabase),
  getCurrentUser: () => Promise.resolve({ id: "user_123" })
}))

// Mock @/lib/ai properly avoiding hoisting issues
const { mockComplete } = vi.hoisted(() => {
  return { mockComplete: vi.fn() }
})

vi.mock("@/lib/ai", () => ({
  googleAI: {
    complete: mockComplete
  }
}))

describe("generateMentorEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue(mockChain)
    mockSelect.mockReturnValue(mockChain)
    mockEq.mockReturnValue(mockChain)
    mockContains.mockReturnValue(mockChain)
  })

  it("should generate email using AI", async () => {
    // Mock saved mentor
    mockSingle
      .mockResolvedValueOnce({ 
        data: { metadata: { mentor_name: "Dr. Smith", institution: "MIT", research_areas: ["AI"] } } 
      })
      // Mock user profile
      .mockResolvedValueOnce({ 
        data: { school: "High School", grade_level: 12, interests: ["Coding"], career_goals: "CS Major" } 
      })

    // Mock AI response
    mockComplete.mockResolvedValueOnce({
      text: JSON.stringify({
        subject: "Research Inquiry",
        body: "Dear Dr. Smith..."
      })
    })

    const result = await generateMentorEmail("mentor_1")

    expect(result.success).toBe(true)
    expect(result.email).toEqual({
      subject: "Research Inquiry",
      body: "Dear Dr. Smith..."
    })
    
    expect(mockComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user' })
        ])
      })
    )
  })

  it("should handle AI generation errors", async () => {
    mockSingle.mockResolvedValue({ data: {} })
    mockComplete.mockRejectedValueOnce(new Error("AI Error"))

    const result = await generateMentorEmail("mentor_1")

    expect(result.success).toBe(false)
    expect(result.message).toContain("failed")
  })
})
