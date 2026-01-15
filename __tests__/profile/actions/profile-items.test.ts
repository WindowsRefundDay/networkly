import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    achievement: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    extracurricular: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

describe("Profile Items Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Achievement Actions", () => {
    describe("addAchievement", () => {
      it("should throw error if user is not authenticated", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: null } as any)

        const { addAchievement } = await import("@/app/actions/profile-items")

        await expect(
          addAchievement({ title: "Award", category: "Academic", date: "2024-01-15", icon: "trophy" })
        ).rejects.toThrow("Unauthorized")
      })

      it("should throw error if user is not found", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

        const { addAchievement } = await import("@/app/actions/profile-items")

        await expect(
          addAchievement({ title: "Award", category: "Academic", date: "2024-01-15", icon: "trophy" })
        ).rejects.toThrow("User not found")
      })

      it("should create achievement with valid data", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: "user-1",
        } as any)
        vi.mocked(prisma.achievement.create).mockResolvedValueOnce({
          id: "achievement-1",
          title: "Dean's List",
          category: "Academic",
          description: null,
          date: "2024-01-15",
          icon: "trophy",
          userId: "user-1",
        } as any)

        const { addAchievement } = await import("@/app/actions/profile-items")

        const result = await addAchievement({
          title: "Dean's List",
          category: "Academic",
          date: "2024-01-15",
          icon: "trophy",
        })

        expect(prisma.achievement.create).toHaveBeenCalledWith({
          data: {
            title: "Dean's List",
            category: "Academic",
            description: null,
            date: "2024-01-15",
            icon: "trophy",
            userId: "user-1",
          },
        })
        expect(result.title).toBe("Dean's List")
      })
    })

    describe("updateAchievement", () => {
      it("should throw error if achievement not found or not owned", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: "user-1",
        } as any)
        vi.mocked(prisma.achievement.findFirst).mockResolvedValueOnce(null)

        const { updateAchievement } = await import("@/app/actions/profile-items")

        await expect(
          updateAchievement("achievement-1", { title: "Updated" })
        ).rejects.toThrow("Achievement not found")
      })

      it("should update achievement when user owns it", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: "user-1",
        } as any)
        vi.mocked(prisma.achievement.findFirst).mockResolvedValueOnce({
          id: "achievement-1",
          userId: "user-1",
        } as any)
        vi.mocked(prisma.achievement.update).mockResolvedValueOnce({
          id: "achievement-1",
          title: "Updated Title",
        } as any)

        const { updateAchievement } = await import("@/app/actions/profile-items")

        const result = await updateAchievement("achievement-1", {
          title: "Updated Title",
        })

        expect(prisma.achievement.update).toHaveBeenCalledWith({
          where: { id: "achievement-1" },
          data: { title: "Updated Title" },
        })
        expect(result.title).toBe("Updated Title")
      })
    })

    describe("deleteAchievement", () => {
      it("should delete achievement when user owns it", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: "user-1",
        } as any)
        vi.mocked(prisma.achievement.findFirst).mockResolvedValueOnce({
          id: "achievement-1",
          userId: "user-1",
        } as any)
        vi.mocked(prisma.achievement.delete).mockResolvedValueOnce({} as any)

        const { deleteAchievement } = await import("@/app/actions/profile-items")

        const result = await deleteAchievement("achievement-1")

        expect(prisma.achievement.delete).toHaveBeenCalledWith({
          where: { id: "achievement-1" },
        })
        expect(result.success).toBe(true)
      })
    })
  })

  describe("Extracurricular Actions", () => {
    describe("addExtracurricular", () => {
      it("should create extracurricular with valid data", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: "user-1",
        } as any)
        vi.mocked(prisma.extracurricular.create).mockResolvedValueOnce({
          id: "ext-1",
          title: "President",
          organization: "CS Club",
          type: "Leadership",
          startDate: "2023",
          endDate: "Present",
          userId: "user-1",
        } as any)

        const { addExtracurricular } = await import("@/app/actions/profile-items")

        const result = await addExtracurricular({
          title: "President",
          organization: "CS Club",
          type: "Leadership",
          startDate: "2023",
          endDate: "Present",
        })

        expect(prisma.extracurricular.create).toHaveBeenCalled()
        expect(result.title).toBe("President")
      })
    })

    describe("deleteExtracurricular", () => {
      it("should throw error if not found or not owned", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: "user-1",
        } as any)
        vi.mocked(prisma.extracurricular.findFirst).mockResolvedValueOnce(null)

        const { deleteExtracurricular } = await import("@/app/actions/profile-items")

        await expect(deleteExtracurricular("ext-1")).rejects.toThrow(
          "Extracurricular not found"
        )
      })
    })
  })

  describe("Skills & Interests Actions", () => {
    describe("addSkill", () => {
      it("should throw error for invalid skill", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)

        const { addSkill } = await import("@/app/actions/profile-items")

        await expect(addSkill("")).rejects.toThrow("Invalid skill")
      })

      it("should throw error for duplicate skill", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: "user-1",
          skills: ["React", "TypeScript"],
        } as any)

        const { addSkill } = await import("@/app/actions/profile-items")

        await expect(addSkill("React")).rejects.toThrow("Skill already exists")
      })

      it("should add new skill to user", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: "user-1",
          skills: ["React"],
        } as any)
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          skills: ["React", "TypeScript"],
        } as any)

        const { addSkill } = await import("@/app/actions/profile-items")

        const result = await addSkill("TypeScript")

        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { clerkId: "clerk-123" },
          data: { skills: ["React", "TypeScript"] },
        })
        expect(result).toContain("TypeScript")
      })
    })

    describe("removeSkill", () => {
      it("should remove skill from user", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: "user-1",
          skills: ["React", "TypeScript"],
        } as any)
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          skills: ["TypeScript"],
        } as any)

        const { removeSkill } = await import("@/app/actions/profile-items")

        const result = await removeSkill("React")

        expect(result).not.toContain("React")
      })
    })

    describe("addInterest", () => {
      it("should throw error for duplicate interest", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: "user-1",
          interests: ["AI", "Web Dev"],
        } as any)

        const { addInterest } = await import("@/app/actions/profile-items")

        await expect(addInterest("AI")).rejects.toThrow("Interest already exists")
      })

      it("should add new interest", async () => {
        vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: "user-1",
          interests: ["AI"],
        } as any)
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          interests: ["AI", "Machine Learning"],
        } as any)

        const { addInterest } = await import("@/app/actions/profile-items")

        const result = await addInterest("Machine Learning")

        expect(result).toContain("Machine Learning")
      })
    })
  })

  describe("updateBio", () => {
    it("should throw error for bio that is too long", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)

      const { updateBio } = await import("@/app/actions/profile-items")

      const longBio = "a".repeat(5001)
      await expect(updateBio(longBio)).rejects.toThrow("Bio too long")
    })

    it("should update bio successfully", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ userId: "clerk-123" } as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        bio: "New bio content",
      } as any)

      const { updateBio } = await import("@/app/actions/profile-items")

      const result = await updateBio("New bio content")

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { clerkId: "clerk-123" },
        data: { bio: "New bio content" },
      })
      expect(result).toBe("New bio content")
    })
  })
})
