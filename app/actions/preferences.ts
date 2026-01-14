"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ============================================================================
// PREFERENCES SCHEMA
// ============================================================================

const preferencesSchema = z.object({
  notifyOpportunities: z.boolean().optional(),
  notifyConnections: z.boolean().optional(),
  notifyMessages: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  publicProfile: z.boolean().optional(),
  showActivityStatus: z.boolean().optional(),
  showProfileViews: z.boolean().optional(),
  aiSuggestions: z.boolean().optional(),
  autoIcebreakers: z.boolean().optional(),
  careerNudges: z.boolean().optional(),
})

export type UserPreferencesInput = z.infer<typeof preferencesSchema>

// ============================================================================
// GET PREFERENCES
// ============================================================================

export async function getPreferences() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  let preferences = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
  })

  // If no preferences exist, create default ones
  if (!preferences) {
    preferences = await prisma.userPreferences.create({
      data: {
        userId: user.id,
      },
    })
  }

  return {
    id: preferences.id,
    notifyOpportunities: preferences.notifyOpportunities,
    notifyConnections: preferences.notifyConnections,
    notifyMessages: preferences.notifyMessages,
    weeklyDigest: preferences.weeklyDigest,
    publicProfile: preferences.publicProfile,
    showActivityStatus: preferences.showActivityStatus,
    showProfileViews: preferences.showProfileViews,
    aiSuggestions: preferences.aiSuggestions,
    autoIcebreakers: preferences.autoIcebreakers,
    careerNudges: preferences.careerNudges,
  }
}

// ============================================================================
// UPDATE PREFERENCES
// ============================================================================

export async function updatePreferences(data: UserPreferencesInput) {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  const validatedData = preferencesSchema.parse(data)

  // Upsert preferences
  const preferences = await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {
      ...validatedData,
      updatedAt: new Date(),
    },
    create: {
      userId: user.id,
      ...validatedData,
    },
  })

  revalidatePath("/settings")
  return preferences
}

// ============================================================================
// RESET PREFERENCES TO DEFAULT
// ============================================================================

export async function resetPreferences() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  // Delete and recreate with defaults
  await prisma.userPreferences.deleteMany({
    where: { userId: user.id },
  })

  const preferences = await prisma.userPreferences.create({
    data: {
      userId: user.id,
    },
  })

  revalidatePath("/settings")
  return preferences
}
