import { describe, it, expect, vi, beforeEach } from "vitest"

const createQueryMock = () => {
  const query: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
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

import { createClient, requireAuth } from "@/lib/supabase/server"

describe("Profile Items Actions", () => {
  const queryMocks = {
    users: createQueryMock(),
    achievements: createQueryMock(),
    extracurriculars: createQueryMock(),
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

  describe("Achievement Actions", () => {
    describe("addAchievement", () => {
      it("should throw error if user is not authenticated", async () => {
        vi.mocked(requireAuth).mockRejectedValueOnce(new Error("Unauthorized"))

        const { addAchievement } = await import("@/app/actions/profile-items")

        await expect(
          addAchievement({ title: "Award", category: "Academic", date: "2024-01-15", icon: "trophy" })
        ).rejects.toThrow("Unauthorized")
      })

      it("should create achievement with valid data", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.achievements.single.mockResolvedValueOnce({
          data: {
            id: "achievement-1",
            title: "Dean's List",
            category: "Academic",
            description: null,
            date: "2024-01-15",
            icon: "trophy",
            user_id: "user-1",
          },
          error: null,
        })

        const { addAchievement } = await import("@/app/actions/profile-items")

        const result = await addAchievement({
          title: "Dean's List",
          category: "Academic",
          date: "2024-01-15",
          icon: "trophy",
        })

        expect(queryMocks.achievements.insert).toHaveBeenCalledWith({
          title: "Dean's List",
          category: "Academic",
          description: null,
          date: "2024-01-15",
          icon: "trophy",
          user_id: "user-1",
        })
        expect(result.title).toBe("Dean's List")
      })

      it("should throw error when insert fails", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.achievements.single.mockResolvedValueOnce({
          data: null,
          error: { message: "Insert failed" },
        })

        const { addAchievement } = await import("@/app/actions/profile-items")

        await expect(
          addAchievement({ title: "Award", category: "Academic", date: "2024-01-15", icon: "trophy" })
        ).rejects.toThrow("Failed to add achievement")
      consoleError.mockRestore()
      })
    })

    describe("updateAchievement", () => {
      it("should throw error if achievement not found or not owned", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.achievements.single.mockResolvedValueOnce({ data: null, error: null })

        const { updateAchievement } = await import("@/app/actions/profile-items")

        await expect(
          updateAchievement("achievement-1", { title: "Updated" })
        ).rejects.toThrow("Achievement not found")
      })

      it("should update achievement when user owns it", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.achievements.single
          .mockResolvedValueOnce({
            data: {
              id: "achievement-1",
              user_id: "user-1",
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              id: "achievement-1",
              title: "Updated Title",
            },
            error: null,
          })

        const { updateAchievement } = await import("@/app/actions/profile-items")

        const result = await updateAchievement("achievement-1", {
          title: "Updated Title",
        })

        expect(queryMocks.achievements.update).toHaveBeenCalledWith({
          title: "Updated Title",
        })
        expect(result.title).toBe("Updated Title")
      })
    })

    describe("deleteAchievement", () => {
      it("should delete achievement when user owns it", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.achievements.single.mockResolvedValueOnce({
          data: { id: "achievement-1", user_id: "user-1" },
          error: null,
        })
        queryMocks.achievements.__result = { data: null, error: null }

        const { deleteAchievement } = await import("@/app/actions/profile-items")

        const result = await deleteAchievement("achievement-1")

        expect(queryMocks.achievements.delete).toHaveBeenCalled()
        expect(result.success).toBe(true)
      })
    })
  })

  describe("Extracurricular Actions", () => {
    describe("addExtracurricular", () => {
      it("should create extracurricular with valid data", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.extracurriculars.single.mockResolvedValueOnce({
          data: {
            id: "ext-1",
            title: "President",
            organization: "CS Club",
            type: "Leadership",
            start_date: "2023",
            end_date: "Present",
            user_id: "user-1",
          },
          error: null,
        })

        const { addExtracurricular } = await import("@/app/actions/profile-items")

        const result = await addExtracurricular({
          title: "President",
          organization: "CS Club",
          type: "Leadership",
          startDate: "2023",
          endDate: "Present",
        })

        expect(queryMocks.extracurriculars.insert).toHaveBeenCalledWith({
          title: "President",
          organization: "CS Club",
          type: "Leadership",
          start_date: "2023",
          end_date: "Present",
          description: null,
          logo: null,
          user_id: "user-1",
        })
        expect(result.title).toBe("President")
      })
    })

    describe("deleteExtracurricular", () => {
      it("should throw error if not found or not owned", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.extracurriculars.single.mockResolvedValueOnce({ data: null, error: null })

        const { deleteExtracurricular } = await import("@/app/actions/profile-items")

        await expect(deleteExtracurricular("ext-1")).rejects.toThrow(
          "Extracurricular not found"
        )
      })

      it("should delete extracurricular when owned", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.extracurriculars.single.mockResolvedValueOnce({
          data: { id: "ext-1", user_id: "user-1" },
          error: null,
        })
        queryMocks.extracurriculars.__result = { data: null, error: null }

        const { deleteExtracurricular } = await import("@/app/actions/profile-items")

        const result = await deleteExtracurricular("ext-1")

        expect(queryMocks.extracurriculars.delete).toHaveBeenCalled()
        expect(result.success).toBe(true)
      })
    })
  })

  describe("Skills & Interests Actions", () => {
    describe("addSkill", () => {
      it("should throw error for invalid skill", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)

        const { addSkill } = await import("@/app/actions/profile-items")

        await expect(addSkill("")).rejects.toThrow("Invalid skill")
      })

      it("should throw error for duplicate skill", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.users.single.mockResolvedValueOnce({
          data: {
            id: "user-1",
            skills: ["React", "TypeScript"],
          },
          error: null,
        })

        const { addSkill } = await import("@/app/actions/profile-items")

        await expect(addSkill("React")).rejects.toThrow("Skill already exists")
      })

      it("should add new skill to user", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.users.single
          .mockResolvedValueOnce({
            data: { id: "user-1", skills: ["React"] },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { skills: ["React", "TypeScript"] },
            error: null,
          })

        const { addSkill } = await import("@/app/actions/profile-items")

        const result = await addSkill("TypeScript")

        expect(queryMocks.users.update).toHaveBeenCalledWith({
          skills: ["React", "TypeScript"],
        })
        expect(result).toContain("TypeScript")
      })
    })

    describe("removeSkill", () => {
      it("should remove skill from user", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.users.single
          .mockResolvedValueOnce({
            data: { id: "user-1", skills: ["React", "TypeScript"] },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { skills: ["TypeScript"] },
            error: null,
          })

        const { removeSkill } = await import("@/app/actions/profile-items")

        const result = await removeSkill("React")

        expect(result).not.toContain("React")
      })
    })

    describe("addInterest", () => {
      it("should throw error for duplicate interest", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.users.single.mockResolvedValueOnce({
          data: {
            id: "user-1",
            interests: ["AI", "Web Dev"],
          },
          error: null,
        })

        const { addInterest } = await import("@/app/actions/profile-items")

        await expect(addInterest("AI")).rejects.toThrow("Interest already exists")
      })

      it("should add new interest", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.users.single
          .mockResolvedValueOnce({
            data: { id: "user-1", interests: ["AI"] },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { interests: ["AI", "Machine Learning"] },
            error: null,
          })

        const { addInterest } = await import("@/app/actions/profile-items")

        const result = await addInterest("Machine Learning")

        expect(result).toContain("Machine Learning")
      })
    })

    describe("removeInterest", () => {
      it("should remove interest from user", async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
        queryMocks.users.single
          .mockResolvedValueOnce({
            data: { id: "user-1", interests: ["AI", "Robotics"] },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { interests: ["Robotics"] },
            error: null,
          })

        const { removeInterest } = await import("@/app/actions/profile-items")

        const result = await removeInterest("AI")

        expect(result).not.toContain("AI")
      })
    })
  })

  describe("updateBio", () => {
    it("should throw error for bio that is too long", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)

      const { updateBio } = await import("@/app/actions/profile-items")

      const longBio = "a".repeat(5001)
      await expect(updateBio(longBio)).rejects.toThrow("Bio too long")
    })

    it("should update bio successfully", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({ id: "user-1" } as any)
      queryMocks.users.single.mockResolvedValueOnce({
        data: { bio: "New bio content" },
        error: null,
      })

      const { updateBio } = await import("@/app/actions/profile-items")

      const result = await updateBio("New bio content")

      expect(queryMocks.users.update).toHaveBeenCalledWith({ bio: "New bio content" })
      expect(result).toBe("New bio content")
    })
  })
})
