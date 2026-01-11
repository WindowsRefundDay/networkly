"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

// ============================================================================
// GET OPPORTUNITIES
// ============================================================================

export async function getOpportunities(filters?: {
    type?: string
    category?: string
    remote?: boolean
}) {
    const { userId } = await auth()

    const where: any = {
        isActive: true,
    }

    if (filters?.type) where.type = filters.type
    if (filters?.category) where.category = filters.category
    if (filters?.remote !== undefined) where.remote = filters.remote

    // Get user for matching data
    let dbUserId: string | null = null
    if (userId) {
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: { id: true }
        })
        dbUserId = user?.id || null
    }

    const opportunities = await prisma.opportunity.findMany({
        where,
        orderBy: { deadline: "asc" },
        include: dbUserId ? {
            userOpportunities: {
                where: { userId: dbUserId },
                select: {
                    matchScore: true,
                    matchReasons: true,
                    status: true,
                }
            }
        } : undefined,
    })

    return opportunities.map((opp) => {
        const userOpp = (opp as any).userOpportunities?.[0]
        return {
            id: opp.id,
            url: opp.url,
            title: opp.title,
            company: opp.company,
            location: opp.location,
            type: opp.type,
            category: opp.category,
            matchScore: userOpp?.matchScore || 0,
            matchReasons: userOpp?.matchReasons || [],
            deadline: opp.deadline ? formatDate(opp.deadline) : null,
            postedDate: getRelativeTime(opp.postedDate),
            logo: opp.logo,
            skills: opp.skills,
            description: opp.description,
            salary: opp.salary,
            duration: opp.duration,
            remote: opp.remote,
            applicants: opp.applicants,
            requirements: opp.requirements,
            extractionConfidence: opp.extractionConfidence,
            status: userOpp?.status || null,
            saved: userOpp?.status === "saved",
        }
    })
}

// ============================================================================
// GET USER'S CURATED/SAVED OPPORTUNITIES
// ============================================================================

export async function getCuratedOpportunities() {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    const userOpportunities = await prisma.userOpportunity.findMany({
        where: {
            userId: user.id,
            status: { in: ["saved", "curated", "applied"] },
        },
        include: { opportunity: true },
        orderBy: { createdAt: "desc" },
    })

    return userOpportunities.map((uo) => ({
        id: uo.opportunity.id,
        title: uo.opportunity.title,
        company: uo.opportunity.company,
        location: uo.opportunity.location,
        type: uo.opportunity.type,
        category: uo.opportunity.category,
        matchScore: uo.matchScore,
        matchReasons: uo.matchReasons,
        deadline: uo.opportunity.deadline ? formatDate(uo.opportunity.deadline) : null,
        logo: uo.opportunity.logo,
        skills: uo.opportunity.skills,
        description: uo.opportunity.description,
        status: uo.status,
        savedAt: uo.createdAt.toISOString(),
    }))
}

// ============================================================================
// SAVE / UNSAVE OPPORTUNITY
// ============================================================================

export async function saveOpportunity(opportunityId: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    // Upsert the user opportunity
    await prisma.userOpportunity.upsert({
        where: {
            userId_opportunityId: {
                userId: user.id,
                opportunityId,
            },
        },
        update: { status: "saved", updatedAt: new Date() },
        create: {
            userId: user.id,
            opportunityId,
            status: "saved",
            matchScore: 0,
            matchReasons: [],
        },
    })

    revalidatePath("/opportunities")
    return { success: true }
}

export async function dismissOpportunity(opportunityId: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    await prisma.userOpportunity.upsert({
        where: {
            userId_opportunityId: {
                userId: user.id,
                opportunityId,
            },
        },
        update: { status: "dismissed", updatedAt: new Date() },
        create: {
            userId: user.id,
            opportunityId,
            status: "dismissed",
            matchScore: 0,
            matchReasons: [],
        },
    })

    revalidatePath("/opportunities")
    return { success: true }
}

export async function unsaveOpportunity(opportunityId: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    await prisma.userOpportunity.delete({
        where: {
            userId_opportunityId: {
                userId: user.id,
                opportunityId,
            },
        },
    })

    revalidatePath("/opportunities")
    return { success: true }
}

// ============================================================================
// ON-DEMAND MATCHING (Placeholder - would call Python backend)
// ============================================================================

export async function calculateMatchScore(opportunityId: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
    })

    if (!opportunity) throw new Error("Opportunity not found")

    // TODO: Call Python MatchingAgent via HTTP or subprocess
    // For now, use a simple heuristic based on skill overlap
    const userSkills = new Set(user.skills.map(s => s.toLowerCase()))
    const oppSkills = new Set(opportunity.skills.map(s => s.toLowerCase()))

    let overlap = 0
    for (const skill of oppSkills) {
        if (userSkills.has(skill)) overlap++
    }

    const skillScore = oppSkills.size > 0 ? Math.round((overlap / oppSkills.size) * 50) : 25
    const interestBonus = user.interests.some(i =>
        opportunity.category.toLowerCase().includes(i.toLowerCase())
    ) ? 25 : 0
    const locationBonus = opportunity.remote ||
        (user.location && opportunity.location?.toLowerCase().includes(user.location.toLowerCase()))
        ? 15 : 0

    const score = Math.min(100, skillScore + interestBonus + locationBonus + 10)

    const reasons = []
    if (overlap > 0) reasons.push(`${overlap} matching skills`)
    if (interestBonus > 0) reasons.push("Matches your interests")
    if (locationBonus > 0) reasons.push(opportunity.remote ? "Remote opportunity" : "Location match")

    // Save the match result
    await prisma.userOpportunity.upsert({
        where: {
            userId_opportunityId: {
                userId: user.id,
                opportunityId,
            },
        },
        update: {
            matchScore: score,
            matchReasons: reasons,
            updatedAt: new Date(),
        },
        create: {
            userId: user.id,
            opportunityId,
            matchScore: score,
            matchReasons: reasons,
            status: "curated",
        },
    })

    revalidatePath("/opportunities")
    return { score, reasons }
}

// Helper functions
function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })
}

function getRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "1 day ago"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
}
