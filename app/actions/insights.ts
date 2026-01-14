"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

// ============================================================================
// GENERATE INSIGHTS
// ============================================================================

interface Insight {
  icon: string
  title: string
  description: string
  action: string
  color: string
}

export async function generateInsights(): Promise<Insight[]> {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, skills: true, interests: true },
  })

  if (!user) throw new Error("User not found")

  const insights: Insight[] = []

  // Calculate date for last 7 and 14 days
  const last7Days = new Date()
  last7Days.setDate(last7Days.getDate() - 7)

  const last14Days = new Date()
  last14Days.setDate(last14Days.getDate() - 14)

  // 1. Profile Engagement Insight
  const recentViews = await prisma.user.findUnique({
    where: { id: user.id },
    select: { profileViews: true, lastViewedAt: true },
  })

  if (recentViews && recentViews.lastViewedAt) {
    const daysSinceView = Math.floor(
      (Date.now() - recentViews.lastViewedAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceView < 7 && recentViews.profileViews > 10) {
      insights.push({
        icon: "TrendingUp",
        title: "Profile Engagement Up",
        description: `Your profile has ${recentViews.profileViews} views. Keep your profile updated to maintain momentum.`,
        action: "Update Profile",
        color: "text-secondary bg-secondary/10",
      })
    }
  }

  // 2. Skill Gap Analysis
  const userSkills = new Set(user.skills.map((s) => s.toLowerCase()))
  const topIndustrySkills = [
    "AWS",
    "Cloud Computing",
    "Docker",
    "Kubernetes",
    "React",
    "TypeScript",
  ]

  const missingSkills = topIndustrySkills.filter(
    (skill) => !userSkills.has(skill.toLowerCase())
  )

  if (missingSkills.length > 0) {
    insights.push({
      icon: "Target",
      title: "Skill Gap Identified",
      description: `Adding '${missingSkills[0]}' could increase your match rate for target roles.`,
      action: "Add Skill",
      color: "text-amber-500 bg-amber-500/10",
    })
  }

  // 3. Network Activity
  const recentConnections = await prisma.connection.count({
    where: {
      OR: [{ requesterId: user.id }, { receiverId: user.id }],
      status: "accepted",
      connectedDate: {
        gte: last7Days,
      },
    },
  })

  if (recentConnections > 0) {
    insights.push({
      icon: "Users",
      title: "Network Growing",
      description: `You made ${recentConnections} new connections this week. Great networking!`,
      action: "View Network",
      color: "text-primary bg-primary/10",
    })
  }

  // 4. Application Activity
  const recentApplications = await prisma.application.count({
    where: {
      userId: user.id,
      appliedDate: {
        gte: last7Days,
      },
    },
  })

  if (recentApplications === 0) {
    const totalApplications = await prisma.application.count({
      where: { userId: user.id },
    })

    if (totalApplications > 0) {
      insights.push({
        icon: "Lightbulb",
        title: "Application Reminder",
        description:
          "You haven't applied to any opportunities this week. Stay active to increase your chances!",
        action: "Browse Opportunities",
        color: "text-rose-500 bg-rose-500/10",
      })
    }
  }

  // 5. Goal Progress
  const activeGoal = await prisma.userGoal.findFirst({
    where: {
      userId: user.id,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  })

  if (activeGoal) {
    insights.push({
      icon: "Target",
      title: "Goal in Progress",
      description: `Keep working on: "${activeGoal.goalText}". Track your progress regularly.`,
      action: "View Roadmap",
      color: "text-primary bg-primary/10",
    })
  } else {
    insights.push({
      icon: "Target",
      title: "Set Your Goal",
      description:
        "Define your career goal to get personalized opportunity recommendations.",
      action: "Set Goal",
      color: "text-amber-500 bg-amber-500/10",
    })
  }

  // 6. Activity Trend
  const activities = await prisma.userActivity.count({
    where: {
      userId: user.id,
      date: {
        gte: last7Days,
      },
    },
  })

  const previousActivities = await prisma.userActivity.count({
    where: {
      userId: user.id,
      date: {
        gte: last14Days,
        lt: last7Days,
      },
    },
  })

  if (activities > previousActivities) {
    const increase = Math.round(
      ((activities - previousActivities) / (previousActivities || 1)) * 100
    )
    insights.push({
      icon: "TrendingUp",
      title: "Activity Increasing",
      description: `Your activity is up ${increase}% this week. Keep up the momentum!`,
      action: "View Analytics",
      color: "text-secondary bg-secondary/10",
    })
  }

  // Return up to 4 insights
  return insights.slice(0, 4)
}
