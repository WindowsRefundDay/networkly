import { describe, it, expect, vi, beforeEach } from "vitest"

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

import { checkRateLimit } from "@/lib/rate-limit"
import { createClient, requireAuth } from "@/lib/supabase/server"

describe("Profile Actions", () => {
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

  describe("updateProfile", () => {
    it("should throw error if user is not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValueOnce(new Error("Unauthorized"))

      const { updateProfile } = await import("@/app/actions/profile")

      await expect(updateProfile({ name: "Test" })).rejects.toThrow("Unauthorized")
    })

    it("should update user profile with valid data", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
      queryMocks.users.single.mockResolvedValueOnce({
        data: {
        id: "user-1",
          name: "Updated Name",
          email: "test@example.com",
        },
        error: null,
      })

      const { updateProfile } = await import("@/app/actions/profile")

      const result = await updateProfile({ name: "Updated Name" })

      expect(queryMocks.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Name",
          profile_updated_at: expect.any(String),
        })
      )
      expect(queryMocks.users.eq).toHaveBeenCalledWith("id", "user-1")
      expect(result.name).toBe("Updated Name")
    })

    it("should throw error when rate limit exceeded", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        success: false,
        remaining: 0,
        reset: Date.now(),
        limit: 30,
      })

      const { updateProfile } = await import("@/app/actions/profile")

      await expect(updateProfile({ name: "Test" })).rejects.toThrow(
        "Rate limit exceeded. You can update your profile 30 times per hour. Try again later."
      )
    })

    it("should validate URL fields and clean empty strings to null", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
      queryMocks.users.single.mockResolvedValueOnce({
        data: {
          id: "user-1",
          linkedin_url: null,
          github_url: null,
          portfolio_url: null,
        },
        error: null,
      })

      const { updateProfile } = await import("@/app/actions/profile")

      await updateProfile({
        linkedinUrl: "",
        githubUrl: "",
        portfolioUrl: "",
      })

      expect(queryMocks.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          linkedin_url: null,
          github_url: null,
          portfolio_url: null,
          profile_updated_at: expect.any(String),
        })
      )
    })
  })

  describe("getProfileByUserId", () => {
    it("should throw error if user is not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValueOnce(new Error("Unauthorized"))

      const { getProfileByUserId } = await import("@/app/actions/profile")

      await expect(getProfileByUserId("user-1")).rejects.toThrow("Unauthorized")
    })

    it("should return null if target user does not exist", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "viewer-1" } as any)
      queryMocks.users.single.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { getProfileByUserId } = await import("@/app/actions/profile")

      const result = await getProfileByUserId("nonexistent-user")

      expect(result).toBeNull()
    })

    it("should return null for private profiles when not owner", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "viewer-1" } as any)
      queryMocks.users.single.mockResolvedValueOnce({
        data: {
          id: "other-user",
          visibility: "private",
        },
        error: null,
      })

      const { getProfileByUserId } = await import("@/app/actions/profile")

      const result = await getProfileByUserId("other-user")

      expect(result).toBeNull()
    })

    it("should return profile data for public profiles", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "viewer-1" } as any)
      queryMocks.users.single.mockResolvedValueOnce({
        data: {
          id: "target-user",
          name: "Target User",
          visibility: "public",
          skills: ["React", "TypeScript"],
          interests: ["AI", "Web Dev"],
        },
        error: null,
      })
      queryMocks.achievements.__result = { data: [], error: null }
      queryMocks.extracurriculars.__result = { data: [], error: null }
      queryMocks.recommendations.__result = { data: [], error: null }
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        success: true,
        remaining: 99,
        reset: Date.now(),
        limit: 100,
      })

      const { getProfileByUserId } = await import("@/app/actions/profile")

      const result = await getProfileByUserId("target-user")

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Target User")
      expect(result?.visibility).toBe("public")
    })

    it("should allow connections-only visibility with a connection", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "viewer-1" } as any)
      queryMocks.users.single.mockResolvedValueOnce({
        data: {
          id: "target-user",
          name: "Target User",
          visibility: "connections",
          skills: [],
          interests: [],
        },
        error: null,
      })
      queryMocks.connections.single.mockResolvedValueOnce({ data: { id: "conn-1" }, error: null })
      queryMocks.achievements.__result = { data: [], error: null }
      queryMocks.extracurriculars.__result = { data: [], error: null }
      queryMocks.recommendations.__result = { data: [], error: null }

      const { getProfileByUserId } = await import("@/app/actions/profile")

      const result = await getProfileByUserId("target-user")

      expect(result).not.toBeNull()
      expect(result?.visibility).toBe("connections")
    })
  })

  describe("calculateProfileStrength", () => {
    it("should return 0 if user does not exist", async () => {
      queryMocks.users.single.mockResolvedValueOnce({ data: null, error: null })

      const { calculateProfileStrength } = await import("@/app/actions/profile")

      const result = await calculateProfileStrength("nonexistent")

      expect(result).toBe(0)
    })

    it("should calculate score based on filled fields", async () => {
      queryMocks.users.single.mockResolvedValueOnce({
        data: {
          id: "user-1",
          name: "Test User",
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
          portfolio_url: null,
        },
        error: null,
      })

      const { calculateProfileStrength } = await import("@/app/actions/profile")

      const result = await calculateProfileStrength("user-1")

      // name(5) + headline(10) + bio(10) + avatar(5) + location(5) + university(5) 
      // + graduationYear(5) + skills>0(15) + skills>=5(5) + interests>0(10) 
      // + achievements>0(5) + linkedin(5) + github(5) = 90
      expect(result).toBe(90)
    })

    it("should cap score at 100", async () => {
      queryMocks.users.single.mockResolvedValueOnce({
        data: {
          id: "user-1",
          name: "Test User",
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

      const result = await calculateProfileStrength("user-1")

      expect(result).toBeLessThanOrEqual(100)
    })
  })

  describe("updateProfileCompleteness", () => {
    it("should update profile completeness based on strength", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
      queryMocks.users.single.mockResolvedValueOnce({
        data: {
          id: "user-1",
          name: "Test User",
          skills: [],
          interests: [],
          achievements: [],
        },
        error: null,
      })

      const { updateProfileCompleteness } = await import("@/app/actions/profile")

      const result = await updateProfileCompleteness()

      expect(queryMocks.users.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_profile_complete: false })
      )
      expect(result).toBeGreaterThanOrEqual(0)
    })
  })
})
