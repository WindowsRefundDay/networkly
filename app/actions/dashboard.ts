"use server"

import { getCurrentUser } from "./user"
import { getAnalyticsSummary } from "./analytics"
import { prisma } from "@/lib/prisma"

export async function getDashboardData() {
  const [user, stats] = await Promise.all([
    getCurrentUser(),
    getAnalyticsSummary()
  ])

  // If user or stats is null, trigger sync flow in dashboard page
  if (!user || !stats) {
    return null
  }

  // Calculate unread messages
  const unreadMessages = await prisma.message.count({
    where: {
      receiverId: user.id,
      unread: true
    }
  })

  // Calculate pending connection requests
  const pendingConnections = await prisma.connection.count({
    where: {
      receiverId: user.id,
      status: "pending"
    }
  })

  // Calculate new opportunities (e.g. created in last 7 days)
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const newOpportunities = await prisma.opportunity.count({
    where: {
      createdAt: {
        gte: oneWeekAgo
      },
      isActive: true
    }
  })

  // Fetch top opportunity match
  const topMatch = await prisma.userOpportunity.findFirst({
    where: {
      userId: user.id,
      opportunity: {
        isActive: true,
        isExpired: false
      }
    },
    orderBy: {
      matchScore: 'desc'
    },
    include: {
      opportunity: true
    }
  })

  let spotlightOpportunity = null
  if (topMatch) {
    // Parse match reasons safely
    let matchReasons: string[] = []
    try {
      if (typeof topMatch.matchReasons === 'string') {
        matchReasons = JSON.parse(topMatch.matchReasons)
      } else if (Array.isArray(topMatch.matchReasons)) {
        matchReasons = topMatch.matchReasons as string[]
      }
    } catch (e) {
      matchReasons = ["Based on your profile skills"]
    }

    spotlightOpportunity = {
      ...topMatch.opportunity,
      matchScore: topMatch.matchScore,
      matchReasons
    }
  } else {
    // Fallback: Get most recent active opportunity if no matches found
    const recentOpp = await prisma.opportunity.findFirst({
      where: { isActive: true, isExpired: false },
      orderBy: { createdAt: 'desc' }
    })

    if (recentOpp) {
      spotlightOpportunity = {
        ...recentOpp,
        matchScore: 0,
        matchReasons: ["New opportunity"]
      }
    }
  }

  // Calculate profile completeness
  let profileScore = 0
  if (user.avatar) profileScore += 10
  if (user.headline) profileScore += 10
  if (user.bio) profileScore += 20
  if (user.skills && user.skills.length > 0) profileScore += 20
  if (user.completedProjects > 0) profileScore += 20
  if (user.connections > 0) profileScore += 20

  // Cap at 100
  const profileCompleteness = Math.min(profileScore, 100)

  const recentActivities = await prisma.userActivity.findMany({
    where: { userId: user.id },
    orderBy: { date: 'desc' },
    take: 10
  })

  return {
    user: {
      ...user,
      profileCompleteness
    },
    dailyDigest: {
      unreadMessages,
      newOpportunities,
      pendingConnections
    },
    stats,
    spotlightOpportunity,
    recentActivities
  }
}
