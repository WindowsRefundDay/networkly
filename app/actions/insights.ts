"use server"

import { createClient, requireAuth } from "@/lib/supabase/server"

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
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("skills, interests, profile_views, last_viewed_at")
    .eq("id", authUser.id)
    .single()

  if (userError || !user) throw new Error("User not found")

  const insights: Insight[] = []

  const last7Days = new Date()
  last7Days.setDate(last7Days.getDate() - 7)

  const last14Days = new Date()
  last14Days.setDate(last14Days.getDate() - 14)

  if (user.last_viewed_at) {
    const daysSinceView = Math.floor(
      (Date.now() - new Date(user.last_viewed_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceView < 7 && user.profile_views > 10) {
      insights.push({
        icon: "TrendingUp",
        title: "Profile Engagement Up",
        description: `Your profile has ${user.profile_views} views. Keep your profile updated to maintain momentum.`,
        action: "Update Profile",
        color: "text-secondary bg-secondary/10",
      })
    }
  }

  const userSkills = new Set((user.skills || []).map((s: string) => s.toLowerCase()))
  const topIndustrySkills = ["AWS", "Cloud Computing", "Docker", "Kubernetes", "React", "TypeScript"]

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

  const { count: recentConnections } = await supabase
    .from("connections")
    .select("*", { count: "exact", head: true })
    .or(`requester_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
    .eq("status", "accepted")
    .gte("connected_date", last7Days.toISOString())

  if ((recentConnections || 0) > 0) {
    insights.push({
      icon: "Users",
      title: "Network Growing",
      description: `You made ${recentConnections} new connections this week. Great networking!`,
      action: "View Network",
      color: "text-primary bg-primary/10",
    })
  }

  const { count: recentApplications } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", authUser.id)
    .gte("applied_date", last7Days.toISOString())

  if ((recentApplications || 0) === 0) {
    const { count: totalApplications } = await supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", authUser.id)

    if ((totalApplications || 0) > 0) {
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

  const { data: activeGoal } = await supabase
    .from("user_goals")
    .select("goal_text")
    .eq("user_id", authUser.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (activeGoal) {
    insights.push({
      icon: "Target",
      title: "Goal in Progress",
      description: `Keep working on: "${activeGoal.goal_text}". Track your progress regularly.`,
      action: "View Roadmap",
      color: "text-primary bg-primary/10",
    })
  } else {
    insights.push({
      icon: "Target",
      title: "Set Your Goal",
      description: "Define your career goal to get personalized opportunity recommendations.",
      action: "Set Goal",
      color: "text-amber-500 bg-amber-500/10",
    })
  }

  const { count: activities } = await supabase
    .from("user_activities")
    .select("*", { count: "exact", head: true })
    .eq("user_id", authUser.id)
    .gte("date", last7Days.toISOString())

  const { count: previousActivities } = await supabase
    .from("user_activities")
    .select("*", { count: "exact", head: true })
    .eq("user_id", authUser.id)
    .gte("date", last14Days.toISOString())
    .lt("date", last7Days.toISOString())

  if ((activities || 0) > (previousActivities || 0)) {
    const increase = Math.round(
      (((activities || 0) - (previousActivities || 0)) / ((previousActivities || 0) || 1)) * 100
    )
    insights.push({
      icon: "TrendingUp",
      title: "Activity Increasing",
      description: `Your activity is up ${increase}% this week. Keep up the momentum!`,
      action: "View Analytics",
      color: "text-secondary bg-secondary/10",
    })
  }

  return insights.slice(0, 4)
}
