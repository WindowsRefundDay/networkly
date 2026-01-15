"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export async function getAnalyticsSummary() {
    const { userId } = await auth()
    if (!userId) return null

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
            applications: true,
            analyticsData: true,
        }
    })

    if (!user) return null

    const profileViewsData = user.analyticsData?.profileViews
        ? (user.analyticsData.profileViews as { value: number }[])
        : generateDefaultSparklineData()

    const networkGrowthData = user.analyticsData?.networkGrowth
        ? (user.analyticsData.networkGrowth as { value: number }[])
        : generateDefaultSparklineData()

    const searchAppearancesData = generateDefaultSparklineData()

    return {
        profileViews: {
            value: user.profileViews,
            change: "+0%",
            trend: "up"
        },
        searchAppearances: {
            value: user.searchAppearances,
            change: "+0%",
            trend: "up"
        },
        connections: {
            value: user.connections,
            change: "+0%",
            trend: "up"
        },
        applications: {
            value: user.applications.length,
            change: "+0",
            trend: "up"
        },
        projects: {
            value: user.completedProjects,
            change: "+0",
            trend: "up"
        },
        sparklineData: {
            profileViews: profileViewsData,
            networkGrowth: networkGrowthData,
            searchAppearances: searchAppearancesData
        }
    }
}

function generateDefaultSparklineData(): { value: number }[] {
    return Array.from({ length: 7 }, () => ({ value: 0 }))
}

export async function getProfileViewsData() {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const analytics = await prisma.analyticsData.findUnique({
        where: { userId: (await prisma.user.findUnique({ where: { clerkId: userId } }))?.id }
    })

    if (!analytics || !analytics.profileViews) return []

    return analytics.profileViews as { date: string; views: number }[]
}

export async function getNetworkGrowthData() {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const analytics = await prisma.analyticsData.findUnique({
        where: { userId: (await prisma.user.findUnique({ where: { clerkId: userId } }))?.id }
    })

    if (!analytics || !analytics.networkGrowth) return []

    return analytics.networkGrowth as { month: string; connections: number }[]
}
