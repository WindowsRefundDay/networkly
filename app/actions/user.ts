"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { cache } from "react"

// ============================================================================
// GET CURRENT USER (with React cache for deduplication)
// ============================================================================

async function fetchCurrentUser() {
    const { userId } = await auth()
    if (!userId) return null

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
            achievements: true,
            extracurriculars: true,
            analyticsData: true,
        },
    })

    if (!user) return null

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        headline: user.headline,
        bio: user.bio,
        location: user.location,
        university: user.university,
        graduationYear: user.graduationYear?.toString() || null,
        skills: user.skills,
        interests: user.interests,
        connections: user.connections,
        profileViews: user.profileViews,
        searchAppearances: user.searchAppearances,
        completedProjects: user.completedProjects,
        linkedinUrl: (user as any).linkedinUrl || null,
        githubUrl: (user as any).githubUrl || null,
        portfolioUrl: (user as any).portfolioUrl || null,
        achievements: user.achievements.map((a) => ({
            id: a.id,
            title: a.title,
            date: a.date,
            icon: a.icon,
        })),
        extracurriculars: user.extracurriculars.map((e) => ({
            id: e.id,
            title: e.title,
            organization: e.organization,
            type: e.type,
            startDate: e.startDate,
            endDate: e.endDate,
            description: e.description,
            logo: e.logo,
        })),
    }
}

// Cache the user fetch to deduplicate requests within the same render
export const getCurrentUser = cache(fetchCurrentUser)

// ============================================================================
// GET USER ANALYTICS
// ============================================================================

export async function getUserAnalytics() {
    const { userId } = await auth()
    if (!userId) return null

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
            analyticsData: true,
        },
    })

    if (!user || !user.analyticsData) {
        return {
            profileViews: [],
            networkGrowth: [],
            skillEndorsements: [],
        }
    }

    return {
        profileViews: user.analyticsData.profileViews as { date: string; views: number }[],
        networkGrowth: user.analyticsData.networkGrowth as { month: string; connections: number }[],
        skillEndorsements: user.analyticsData.skillEndorsements as { skill: string; count: number }[],
    }
}

// ============================================================================
// UPDATE USER PROFILE
// ============================================================================

export async function updateUserProfile(data: {
    name?: string
    headline?: string
    bio?: string
    location?: string
    university?: string
    graduationYear?: number
    skills?: string[]
    interests?: string[]
}) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.update({
        where: { clerkId: userId },
        data,
    })

    return user
}

// ============================================================================
// GET EVENTS
// ============================================================================

export async function getEvents() {
    const events = await prisma.event.findMany({
        orderBy: { createdAt: "desc" },
    })

    return events.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        location: event.location,
        type: event.type,
        attendees: event.attendees,
        image: event.image,
    }))
}

// ============================================================================
// SYNC USER FROM CLERK
// ============================================================================

export async function syncUserFromClerk(clerkUser: {
    id: string
    emailAddresses: { emailAddress: string }[]
    firstName: string | null
    lastName: string | null
    imageUrl: string | null
}) {
    const email = clerkUser.emailAddresses[0]?.emailAddress
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "User"

    const user = await prisma.user.upsert({
        where: { clerkId: clerkUser.id },
        update: {
            email,
            name,
            avatar: clerkUser.imageUrl,
        },
        create: {
            clerkId: clerkUser.id,
            email,
            name,
            avatar: clerkUser.imageUrl,
        },
    })

    return user
}

// ============================================================================
// GET USER PROFILE (Extended profile data for high school students)
// ============================================================================

export async function getUserProfile() {
    const { userId } = await auth()
    if (!userId) return null

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
    })

    if (!user) return null

    const userProfile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
    })

    if (!userProfile) return null

    return {
        id: userProfile.id,
        school: userProfile.school,
        grade_level: userProfile.grade_level,
        interests: userProfile.interests,
        location: userProfile.location,
        career_goals: userProfile.career_goals,
        preferred_opportunity_types: userProfile.preferred_opportunity_types,
        academic_strengths: userProfile.academic_strengths,
        availability: userProfile.availability,
    }
}
