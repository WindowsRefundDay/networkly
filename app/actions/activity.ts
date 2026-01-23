"use server"

import { createClient, getCurrentUser, requireAuth } from "@/lib/supabase/server"

// ============================================================================
// LOG ACTIVITY
// ============================================================================

export async function logActivity(
  type: string,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient()
  const authUser = await getCurrentUser()
  if (!authUser) return null

  const { data: activity, error } = await supabase
    .from("user_activities")
    .insert({
      user_id: authUser.id,
      type,
      metadata: metadata || null,
      date: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("[logActivity]", error)
    return null
  }

  return activity
}

// ============================================================================
// GET ACTIVITY HEATMAP
// ============================================================================

export async function getActivityHeatmap(weeks: number = 12) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - weeks * 7)

  const { data: activities, error } = await supabase
    .from("user_activities")
    .select("date, type")
    .eq("user_id", authUser.id)
    .gte("date", startDate.toISOString())
    .lte("date", endDate.toISOString())
    .order("date", { ascending: true })

  if (error) {
    console.error("[getActivityHeatmap]", error)
    return []
  }

  const activityMap: Record<string, number> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(activities || []).forEach((activity: any) => {
    const dateKey = new Date(activity.date).toISOString().split("T")[0]
    activityMap[dateKey] = (activityMap[dateKey] || 0) + 1
  })

  const heatmapData: Array<{ date: string; count: number; dayOfWeek: number }> = []

  for (
    let d = new Date(startDate);
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    const dateKey = d.toISOString().split("T")[0]
    heatmapData.push({
      date: dateKey,
      count: activityMap[dateKey] || 0,
      dayOfWeek: d.getDay(),
    })
  }

  return heatmapData
}

// ============================================================================
// GET DAILY ACTIVITY
// ============================================================================

export async function getDailyActivity(date: Date) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const { data: activities, error } = await supabase
    .from("user_activities")
    .select("*")
    .eq("user_id", authUser.id)
    .gte("date", startOfDay.toISOString())
    .lte("date", endOfDay.toISOString())
    .order("date", { ascending: false })

  if (error) {
    console.error("[getDailyActivity]", error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (activities || []).map((activity: any) => ({
    id: activity.id,
    type: activity.type,
    metadata: activity.metadata,
    date: activity.date,
  }))
}

// ============================================================================
// GET ACTIVITY STATS
// ============================================================================

export async function getActivityStats(days: number = 30) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: activities, error } = await supabase
    .from("user_activities")
    .select("type")
    .eq("user_id", authUser.id)
    .gte("date", startDate.toISOString())

  if (error) {
    console.error("[getActivityStats]", error)
    return {
      total: 0,
      byType: {},
      period: `${days} days`,
    }
  }

  const stats: Record<string, number> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(activities || []).forEach((activity: any) => {
    stats[activity.type] = (stats[activity.type] || 0) + 1
  })

  return {
    total: activities?.length || 0,
    byType: stats,
    period: `${days} days`,
  }
}
