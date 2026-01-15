"use server"

import { prisma } from "@/lib/prisma"
import { auth, currentUser } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { syncUserFromClerk } from "./user"

// ============================================================================
// GET USER GOAL
// ============================================================================

export async function getGoal() {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    let user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
            goals: {
                where: { isActive: true },
                orderBy: { createdAt: "desc" },
                take: 1,
            },
        },
    })

    // If user doesn't exist in database, sync from Clerk
    if (!user) {
        const clerkUser = await currentUser()
        if (clerkUser) {
            await syncUserFromClerk({
                id: clerkUser.id,
                emailAddresses: clerkUser.emailAddresses,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                imageUrl: clerkUser.imageUrl,
            })
            
            // Fetch user again after sync
            user = await prisma.user.findUnique({
                where: { clerkId: userId },
                include: {
                    goals: {
                        where: { isActive: true },
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
            })
        }
    }

    if (!user) return null

    const goal = user.goals[0]
    if (!goal) return null

    return {
        id: goal.id,
        goalText: goal.goalText,
        roadmap: goal.roadmap,
        filters: goal.filters,
        createdAt: goal.createdAt.toISOString(),
    }
}

// ============================================================================
// CREATE / UPDATE GOAL
// ============================================================================

export async function createGoal(goalText: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    // Deactivate any existing active goals
    await prisma.userGoal.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false },
    })

    // TODO: Call Python GoalPlannerAgent to generate roadmap
    // For now, create a placeholder roadmap
    const roadmap = [
        {
            order: 1,
            title: "Research Opportunities",
            description: `Search for ${goalText.toLowerCase()} opportunities that match your profile.`,
            timeframe: "Next 1-2 weeks",
            opportunityTypes: ["Internship", "Research"],
        },
        {
            order: 2,
            title: "Update Your Profile",
            description: "Ensure your skills and interests are up to date for better matching.",
            timeframe: "Next 1 week",
            opportunityTypes: [],
        },
        {
            order: 3,
            title: "Apply to Top Matches",
            description: "Focus on opportunities with high match scores first.",
            timeframe: "Next 2-4 weeks",
            opportunityTypes: ["Internship", "Scholarship"],
        },
        {
            order: 4,
            title: "Track Applications",
            description: "Monitor your application status and follow up as needed.",
            timeframe: "Ongoing",
            opportunityTypes: [],
        },
    ]

    const filters = {
        recommendedCategories: ["STEM", "Research"],
        recommendedTypes: ["Internship", "Research", "Scholarship"],
        searchQueries: [goalText],
    }

    const goal = await prisma.userGoal.create({
        data: {
            userId: user.id,
            goalText,
            roadmap,
            filters,
            isActive: true,
        },
    })

    revalidatePath("/dashboard")
    revalidatePath("/opportunities")

    return {
        id: goal.id,
        goalText: goal.goalText,
        roadmap: goal.roadmap,
        filters: goal.filters,
    }
}

export async function updateGoal(goalId: string, goalText: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    // Verify ownership
    const existing = await prisma.userGoal.findFirst({
        where: { id: goalId, userId: user.id },
    })

    if (!existing) throw new Error("Goal not found")

    // TODO: Regenerate roadmap with Python GoalPlannerAgent
    const updatedGoal = await prisma.userGoal.update({
        where: { id: goalId },
        data: {
            goalText,
            updatedAt: new Date(),
        },
    })

    revalidatePath("/dashboard")
    revalidatePath("/opportunities")

    return {
        id: updatedGoal.id,
        goalText: updatedGoal.goalText,
        roadmap: updatedGoal.roadmap,
        filters: updatedGoal.filters,
    }
}

export async function deleteGoal(goalId: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    await prisma.userGoal.delete({
        where: { id: goalId, userId: user.id },
    })

    revalidatePath("/dashboard")
    return { success: true }
}

// ============================================================================
// GET ROADMAP PROGRESS
// ============================================================================

export async function getRoadmapProgress() {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
            goals: {
                where: { isActive: true },
                take: 1,
            },
            savedOpportunities: {
                where: { status: { in: ["saved", "applied"] } },
            },
            applications: true,
        },
    })

    if (!user) return null

    const goal = user.goals[0]
    if (!goal) return null

    // Calculate progress based on activity
    const savedCount = user.savedOpportunities.length
    const appliedCount = user.applications.length

    // Simple progress calculation
    let progress = 0
    if (savedCount > 0) progress += 25  // Step 1: Research
    if (user.skills.length > 3) progress += 25  // Step 2: Profile updated
    if (appliedCount > 0) progress += 25  // Step 3: Applied
    if (appliedCount > 3) progress += 25  // Step 4: Multiple applications

    return {
        goalText: goal.goalText,
        progress: Math.min(100, progress),
        savedCount,
        appliedCount,
        roadmap: goal.roadmap,
    }
}

// ============================================================================
// PROFILE GOALS (Unified Goal Tracking System)
// ============================================================================

const PROFILE_GOAL_STATUSES = ["pending", "in_progress", "completed"] as const
export type ProfileGoalStatus = typeof PROFILE_GOAL_STATUSES[number]

export interface ProfileGoalData {
    id: string
    title: string
    targetDate: string
    status: ProfileGoalStatus
    createdAt: string
}

export async function getProfileGoals(): Promise<ProfileGoalData[]> {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
    })

    if (!user) return []

    const goals = await prisma.profileGoal.findMany({
        where: { userId: user.id },
        orderBy: [
            { status: "asc" },
            { targetDate: "asc" },
        ],
    })

    return goals.map((g) => ({
        id: g.id,
        title: g.title,
        targetDate: g.targetDate.toISOString().split("T")[0],
        status: g.status as ProfileGoalStatus,
        createdAt: g.createdAt.toISOString(),
    }))
}

export async function addProfileGoal(data: {
    title: string
    targetDate: string
    status?: ProfileGoalStatus
}) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
    })

    if (!user) throw new Error("User not found")

    if (!data.title || data.title.length > 100) {
        throw new Error("Invalid goal title")
    }

    const goal = await prisma.profileGoal.create({
        data: {
            userId: user.id,
            title: data.title.trim(),
            targetDate: new Date(data.targetDate),
            status: data.status || "pending",
        },
    })

    revalidatePath("/profile")
    revalidatePath("/opportunities")
    revalidatePath("/analytics")

    return {
        id: goal.id,
        title: goal.title,
        targetDate: goal.targetDate.toISOString().split("T")[0],
        status: goal.status as ProfileGoalStatus,
        createdAt: goal.createdAt.toISOString(),
    }
}

export async function updateProfileGoal(
    id: string,
    data: Partial<{ title: string; targetDate: string; status: ProfileGoalStatus }>
) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
    })

    if (!user) throw new Error("User not found")

    const existing = await prisma.profileGoal.findFirst({
        where: { id, userId: user.id },
    })

    if (!existing) throw new Error("Goal not found")

    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title.trim()
    if (data.targetDate !== undefined) updateData.targetDate = new Date(data.targetDate)
    if (data.status !== undefined) updateData.status = data.status

    const goal = await prisma.profileGoal.update({
        where: { id },
        data: updateData,
    })

    revalidatePath("/profile")
    revalidatePath("/opportunities")
    revalidatePath("/analytics")

    return {
        id: goal.id,
        title: goal.title,
        targetDate: goal.targetDate.toISOString().split("T")[0],
        status: goal.status as ProfileGoalStatus,
        createdAt: goal.createdAt.toISOString(),
    }
}

export async function updateProfileGoalStatus(id: string, status: ProfileGoalStatus) {
    return updateProfileGoal(id, { status })
}

export async function deleteProfileGoal(id: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
    })

    if (!user) throw new Error("User not found")

    const existing = await prisma.profileGoal.findFirst({
        where: { id, userId: user.id },
    })

    if (!existing) throw new Error("Goal not found")

    await prisma.profileGoal.delete({
        where: { id },
    })

    revalidatePath("/profile")
    revalidatePath("/opportunities")
    revalidatePath("/analytics")

    return { success: true }
}

export async function getProfileGoalsProgress() {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
    })

    if (!user) return { total: 0, completed: 0, inProgress: 0, pending: 0, percentage: 0 }

    const goals = await prisma.profileGoal.findMany({
        where: { userId: user.id },
        select: { status: true },
    })

    const total = goals.length
    const completed = goals.filter((g) => g.status === "completed").length
    const inProgress = goals.filter((g) => g.status === "in_progress").length
    const pending = goals.filter((g) => g.status === "pending").length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, completed, inProgress, pending, percentage }
}
