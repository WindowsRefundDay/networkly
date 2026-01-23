"use server"

import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Integration tests for profile update flow
 * Tests the complete flow from user action to database update
 */

const createQueryMock = () => {
  const query: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    __result: { data: null, error: null },
    then: function (resolve: (value: any) => any, reject?: (reason: any) => any) {
      return Promise.resolve(this.__result).then(resolve, reject)
    },
  }

  return query
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  requireAuth: vi.fn(),
}))

// Mock rate limiting
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() =>
    Promise.resolve({ success: true, remaining: 99, reset: Date.now(), limit: 100 })
  ),
  createRateLimitKey: vi.fn((...args) => args.join(":")),
  RATE_LIMITS: {
    PROFILE_VIEW: { limit: 100, windowSeconds: 3600 },
    PROFILE_UPDATE: { limit: 30, windowSeconds: 3600 },
    API_CALL: { limit: 1000, windowSeconds: 3600 },
  },
}))

import { createClient, requireAuth } from "@/lib/supabase/server"

describe("Profile Update Flow Integration", () => {
  const queryMocks = {
    users: createQueryMock(),
    achievements: createQueryMock(),
    extracurriculars: createQueryMock(),
    recommendations: createQueryMock(),
    connections: createQueryMock(),
  }

  const supabaseMock = {
    from: vi.fn((table: keyof typeof queryMocks) => queryMocks[table]),
    auth: {
      getUser: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue(supabaseMock as any)
    Object.values(queryMocks).forEach((query) => {
      query.__result = { data: null, error: null }
    })
  })

  describe("Complete Profile Update Flow", () => {
    it("should successfully update profile with all fields", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)

      const updatedUser = {
        id: "user-1",
        name: "John Doe",
        headline: "Senior Software Engineer",
        bio: "Passionate developer",
        location: "San Francisco, CA",
        university: "Stanford University",
        graduation_year: 2024,
        skills: ["React", "TypeScript"],
        interests: ["AI", "Web Dev"],
        linkedin_url: "https://linkedin.com/in/johndoe",
        github_url: "https://github.com/johndoe",
        portfolio_url: "https://johndoe.dev",
        visibility: "public",
      }

      queryMocks.users.single.mockResolvedValueOnce({ data: updatedUser, error: null })

      const { updateProfile } = await import("@/app/actions/profile")

      const result = await updateProfile({
        name: "John Doe",
        headline: "Senior Software Engineer",
        bio: "Passionate developer",
        location: "San Francisco, CA",
        university: "Stanford University",
        graduationYear: 2024,
        skills: ["React", "TypeScript"],
        interests: ["AI", "Web Dev"],
        linkedinUrl: "https://linkedin.com/in/johndoe",
        githubUrl: "https://github.com/johndoe",
        portfolioUrl: "https://johndoe.dev",
        visibility: "public",
      })

      expect(queryMocks.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "John Doe",
          headline: "Senior Software Engineer",
          bio: "Passionate developer",
          location: "San Francisco, CA",
          university: "Stanford University",
          graduation_year: 2024,
          skills: ["React", "TypeScript"],
          interests: ["AI", "Web Dev"],
          linkedin_url: "https://linkedin.com/in/johndoe",
          github_url: "https://github.com/johndoe",
          portfolio_url: "https://johndoe.dev",
          visibility: "public",
          profile_updated_at: expect.any(String),
        })
      )
      expect(queryMocks.users.eq).toHaveBeenCalledWith("id", "user-1")
      expect(result).toEqual(updatedUser)
    })

    it("should handle partial updates", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)

      queryMocks.users.single.mockResolvedValueOnce({
        data: {
          id: "user-1",
          name: "Updated Name",
        },
        error: null,
      })

      const { updateProfile } = await import("@/app/actions/profile")

      const result = await updateProfile({ name: "Updated Name" })

      expect(queryMocks.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Name",
          linkedin_url: null,
          github_url: null,
          portfolio_url: null,
          profile_updated_at: expect.any(String),
        })
      )
      expect(result.name).toBe("Updated Name")
    })
  })

  describe("Profile Viewing Flow", () => {
    it("should track profile view for public profiles", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "viewer-id" } as any)

      queryMocks.users.single.mockResolvedValueOnce({
        data: {
          id: "target-id",
          name: "Target User",
          visibility: "public",
          skills: [],
          interests: [],
          profile_views: 2,
        },
        error: null,
      })
      queryMocks.achievements.__result = { data: [], error: null }
      queryMocks.extracurriculars.__result = { data: [], error: null }
      queryMocks.recommendations.__result = { data: [], error: null }

      const { getProfileByUserId } = await import("@/app/actions/profile")

      const result = await getProfileByUserId("target-id")

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Target User")
      expect(queryMocks.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          profile_views: 3,
          last_viewed_at: expect.any(String),
        })
      )
    })

    it("should not track view for own profile", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "same-user" } as any)

      queryMocks.users.single.mockResolvedValueOnce({
        data: {
          id: "same-user",
          name: "Self User",
          visibility: "public",
          skills: [],
          interests: [],
          profile_views: 5,
        },
        error: null,
      })
      queryMocks.achievements.__result = { data: [], error: null }
      queryMocks.extracurriculars.__result = { data: [], error: null }
      queryMocks.recommendations.__result = { data: [], error: null }

      const { getProfileByUserId } = await import("@/app/actions/profile")

      await getProfileByUserId("same-user")

      expect(queryMocks.users.update).not.toHaveBeenCalled()
    })
  })

  describe("Profile Strength Calculation Flow", () => {
    it("should calculate strength based on filled fields", async () => {
      queryMocks.users.single.mockResolvedValueOnce({
        data: {
          id: "user-1",
          name: "Complete User",
          headline: "Developer",
          bio: "About me",
          avatar: "https://example.com/avatar.jpg",
          location: "NYC",
          university: "MIT",
          graduation_year: 2024,
          skills: ["React", "TypeScript", "Node.js", "Python", "SQL"],
          interests: ["AI"],
          achievements: [{ id: "1" }],
          linkedin_url: "https://linkedin.com/in/test",
          github_url: "https://github.com/test",
          portfolio_url: "https://example.com",
        },
        error: null,
      })

      const { calculateProfileStrength } = await import("@/app/actions/profile")

      const strength = await calculateProfileStrength("user-1")

      expect(strength).toBeGreaterThanOrEqual(90)
      expect(strength).toBeLessThanOrEqual(100)
    })

    it("should return low score for incomplete profile", async () => {
      queryMocks.users.single.mockResolvedValueOnce({
        data: {
          id: "user-1",
          name: "Incomplete User",
          skills: [],
          interests: [],
          achievements: [],
        },
        error: null,
      })

      const { calculateProfileStrength } = await import("@/app/actions/profile")

      const strength = await calculateProfileStrength("user-1")

      expect(strength).toBe(5)
    })
  })

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
      queryMocks.users.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
      })

      const { updateProfile } = await import("@/app/actions/profile")

      await expect(updateProfile({ name: "Test" })).rejects.toThrow("Database error")
    })

    it("should validate input data with Zod", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)

      const { updateProfile } = await import("@/app/actions/profile")

      await expect(updateProfile({ name: "a".repeat(101) })).rejects.toThrow()
    })
  })
})
