"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

// ============================================================================
// ENDORSE SKILL
// ============================================================================

export async function endorseSkill(endorseeId: string, skill: string) {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const endorser = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!endorser) throw new Error("User not found")

  // Can't endorse yourself
  if (endorser.id === endorseeId) {
    throw new Error("Cannot endorse your own skills")
  }

  // Verify the endorsee has this skill
  const endorsee = await prisma.user.findUnique({
    where: { id: endorseeId },
    select: { skills: true },
  })

  if (!endorsee) throw new Error("User not found")

  if (!endorsee.skills.includes(skill)) {
    throw new Error("User does not have this skill listed")
  }

  // Create endorsement (or do nothing if it already exists due to unique constraint)
  try {
    const endorsement = await prisma.skillEndorsement.create({
      data: {
        endorserId: endorser.id,
        endorseeId,
        skill,
      },
    })

    revalidatePath("/profile")
    return endorsement
  } catch (error: any) {
    // If unique constraint violation, it means already endorsed
    if (error.code === "P2002") {
      return { alreadyEndorsed: true }
    }
    throw error
  }
}

// ============================================================================
// REMOVE ENDORSEMENT
// ============================================================================

export async function removeEndorsement(endorseeId: string, skill: string) {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const endorser = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!endorser) throw new Error("User not found")

  await prisma.skillEndorsement.delete({
    where: {
      endorserId_endorseeId_skill: {
        endorserId: endorser.id,
        endorseeId,
        skill,
      },
    },
  })

  revalidatePath("/profile")
  return { success: true }
}

// ============================================================================
// GET SKILL ENDORSEMENTS
// ============================================================================

export async function getSkillEndorsements(userId: string) {
  const endorsements = await prisma.skillEndorsement.findMany({
    where: { endorseeId: userId },
    include: {
      endorser: {
        select: {
          id: true,
          name: true,
          avatar: true,
          headline: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Group by skill
  const groupedBySkill: Record<string, any[]> = {}

  endorsements.forEach((endorsement) => {
    if (!groupedBySkill[endorsement.skill]) {
      groupedBySkill[endorsement.skill] = []
    }
    groupedBySkill[endorsement.skill].push({
      id: endorsement.id,
      endorser: {
        id: endorsement.endorser.id,
        name: endorsement.endorser.name,
        avatar: endorsement.endorser.avatar,
        headline: endorsement.endorser.headline,
      },
      createdAt: endorsement.createdAt.toISOString(),
    })
  })

  // Convert to array format with counts
  const skillEndorsements = Object.entries(groupedBySkill).map(
    ([skill, endorsers]) => ({
      skill,
      count: endorsers.length,
      endorsers,
    })
  )

  // Sort by count descending
  skillEndorsements.sort((a, b) => b.count - a.count)

  return skillEndorsements
}

// ============================================================================
// GET MY ENDORSEMENTS (given by me)
// ============================================================================

export async function getMyEndorsements() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  const endorsements = await prisma.skillEndorsement.findMany({
    where: { endorserId: user.id },
    include: {
      endorsee: {
        select: {
          id: true,
          name: true,
          avatar: true,
          headline: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return endorsements.map((e) => ({
    id: e.id,
    skill: e.skill,
    endorsee: e.endorsee,
    createdAt: e.createdAt.toISOString(),
  }))
}

// ============================================================================
// CHECK IF ENDORSED
// ============================================================================

export async function hasEndorsed(endorseeId: string, skill: string) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return false

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) return false

  const endorsement = await prisma.skillEndorsement.findUnique({
    where: {
      endorserId_endorseeId_skill: {
        endorserId: user.id,
        endorseeId,
        skill,
      },
    },
  })

  return !!endorsement
}
