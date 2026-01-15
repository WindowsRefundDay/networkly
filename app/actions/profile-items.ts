"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"

// ============================================================================
// ACHIEVEMENT ACTIONS
// ============================================================================

const ACHIEVEMENT_CATEGORIES = ["Academic", "Athletic", "Service", "Arts", "Other"] as const
type AchievementCategory = typeof ACHIEVEMENT_CATEGORIES[number]

const achievementSchema = z.object({
  title: z.string().min(1).max(50),
  category: z.enum(ACHIEVEMENT_CATEGORIES).optional().default("Academic"),
  description: z.string().max(150).optional(),
  date: z.string().min(1), // ISO date string from native date input
  icon: z.enum(["trophy", "award", "star"]).default("trophy"),
})

export async function addAchievement(data: z.infer<typeof achievementSchema>) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  const validatedData = achievementSchema.parse(data)

  const achievement = await prisma.achievement.create({
    data: {
      title: validatedData.title,
      category: validatedData.category,
      description: validatedData.description || null,
      date: validatedData.date,
      icon: validatedData.icon,
      userId: user.id,
    },
  })

  revalidatePath("/profile")
  return achievement
}

export async function updateAchievement(
  id: string,
  data: Partial<z.infer<typeof achievementSchema>>
) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  // Verify ownership
  const existing = await prisma.achievement.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) throw new Error("Achievement not found")

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.category !== undefined) updateData.category = data.category
  if (data.description !== undefined) updateData.description = data.description || null
  if (data.date !== undefined) updateData.date = data.date
  if (data.icon !== undefined) updateData.icon = data.icon

  const achievement = await prisma.achievement.update({
    where: { id },
    data: updateData,
  })

  revalidatePath("/profile")
  return achievement
}

export async function deleteAchievement(id: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  // Verify ownership
  const existing = await prisma.achievement.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) throw new Error("Achievement not found")

  await prisma.achievement.delete({
    where: { id },
  })

  revalidatePath("/profile")
  return { success: true }
}

// ============================================================================
// EXTRACURRICULAR ACTIONS
// ============================================================================

const extracurricularSchema = z.object({
  title: z.string().min(1).max(100),
  organization: z.string().min(1).max(100),
  type: z.enum(["Research", "Leadership", "Technical", "Volunteer", "Other"]),
  startDate: z.string().min(1).max(50),
  endDate: z.string().min(1).max(50),
  description: z.string().max(1000).optional(),
  logo: z.string().url().optional().or(z.literal("")),
})

export async function addExtracurricular(data: z.infer<typeof extracurricularSchema>) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  const validatedData = extracurricularSchema.parse(data)

  const extracurricular = await prisma.extracurricular.create({
    data: {
      ...validatedData,
      logo: validatedData.logo || null,
      userId: user.id,
    },
  })

  revalidatePath("/profile")
  return extracurricular
}

export async function updateExtracurricular(
  id: string,
  data: Partial<z.infer<typeof extracurricularSchema>>
) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  // Verify ownership
  const existing = await prisma.extracurricular.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) throw new Error("Extracurricular not found")

  const extracurricular = await prisma.extracurricular.update({
    where: { id },
    data: {
      ...data,
      logo: data.logo || null,
    },
  })

  revalidatePath("/profile")
  return extracurricular
}

export async function deleteExtracurricular(id: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  // Verify ownership
  const existing = await prisma.extracurricular.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) throw new Error("Extracurricular not found")

  await prisma.extracurricular.delete({
    where: { id },
  })

  revalidatePath("/profile")
  return { success: true }
}

// ============================================================================
// SKILLS & INTERESTS ACTIONS
// ============================================================================

export async function addSkill(skill: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  if (!skill || skill.length > 50) {
    throw new Error("Invalid skill")
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, skills: true },
  })

  if (!user) throw new Error("User not found")

  // Check if skill already exists
  if (user.skills.includes(skill)) {
    throw new Error("Skill already exists")
  }

  const updatedUser = await prisma.user.update({
    where: { clerkId: userId },
    data: {
      skills: [...user.skills, skill],
    },
  })

  revalidatePath("/profile")
  return updatedUser.skills
}

export async function removeSkill(skill: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, skills: true },
  })

  if (!user) throw new Error("User not found")

  const updatedUser = await prisma.user.update({
    where: { clerkId: userId },
    data: {
      skills: user.skills.filter((s) => s !== skill),
    },
  })

  revalidatePath("/profile")
  return updatedUser.skills
}

export async function addInterest(interest: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  if (!interest || interest.length > 50) {
    throw new Error("Invalid interest")
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, interests: true },
  })

  if (!user) throw new Error("User not found")

  // Check if interest already exists
  if (user.interests.includes(interest)) {
    throw new Error("Interest already exists")
  }

  const updatedUser = await prisma.user.update({
    where: { clerkId: userId },
    data: {
      interests: [...user.interests, interest],
    },
  })

  revalidatePath("/profile")
  return updatedUser.interests
}

export async function removeInterest(interest: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, interests: true },
  })

  if (!user) throw new Error("User not found")

  const updatedUser = await prisma.user.update({
    where: { clerkId: userId },
    data: {
      interests: user.interests.filter((i) => i !== interest),
    },
  })

  revalidatePath("/profile")
  return updatedUser.interests
}

// ============================================================================
// BIO UPDATE ACTION
// ============================================================================

export async function updateBio(bio: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  if (bio.length > 5000) {
    throw new Error("Bio too long")
  }

  const user = await prisma.user.update({
    where: { clerkId: userId },
    data: { bio },
  })

  revalidatePath("/profile")
  return user.bio
}
