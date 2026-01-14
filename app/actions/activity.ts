"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

// ============================================================================
// LOG ACTIVITY
// ============================================================================

export async function logActivity(
  type: string,
  metadata?: Record<string, any>
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) return null

  const activity = await prisma.userActivity.create({
    data: {
      userId: user.id,
      type,
      metadata: metadata ? metadata : undefined,
      date: new Date(),
    },
  })

  return activity
}

// ============================================================================
// GET ACTIVITY HEATMAP
// ============================================================================

export async function getActivityHeatmap(weeks: number = 12) {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - weeks * 7)

  // Fetch activities in the date range
  const activities = await prisma.userActivity.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      date: true,
      type: true,
    },
    orderBy: { date: "asc" },
  })

  // Group activities by date
  const activityMap: Record<string, number> = {}

  activities.forEach((activity) => {
    const dateKey = activity.date.toISOString().split("T")[0]
    activityMap[dateKey] = (activityMap[dateKey] || 0) + 1
  })

  // Create a complete grid for all days in the range
  const heatmapData: Array<{ date: string; count: number; dayOfWeek: number }> =
    []

  for (
    let d = new Date(startDate);
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    const dateKey = d.toISOString().split("T")[0]
    heatmapData.push({
      date: dateKey,
      count: activityMap[dateKey] || 0,
      dayOfWeek: d.getDay(), // 0 = Sunday, 1 = Monday, etc.
    })
  }

  return heatmapData
}

// ============================================================================
// GET DAILY ACTIVITY
// ============================================================================

export async function getDailyActivity(date: Date) {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const activities = await prisma.userActivity.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { date: "desc" },
  })

  return activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    metadata: activity.metadata,
    date: activity.date.toISOString(),
  }))
}

// ============================================================================
// GET ACTIVITY STATS
// ============================================================================

export async function getActivityStats(days: number = 30) {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const activities = await prisma.userActivity.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startDate,
      },
    },
    select: {
      type: true,
    },
  })

  // Count by type
  const stats: Record<string, number> = {}
  activities.forEach((activity) => {
    stats[activity.type] = (stats[activity.type] || 0) + 1
  })

  return {
    total: activities.length,
    byType: stats,
    period: `${days} days`,
  }
}
