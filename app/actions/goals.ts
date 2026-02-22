"use server"

import { revalidatePath } from "next/cache"

import { createClient, requireAuth } from "@/lib/supabase/server"
import { triggerDiscovery } from "@/app/actions/discovery"
import type { UserGoal, ProfileGoal, User } from "@/lib/types"

// ============================================================================
// GET USER GOAL
// ============================================================================

export async function getGoal() {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", authUser.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)

  const goals = data as UserGoal[] | null

  if (error) {
    console.error("[getGoal]", error)
    return null
  }

  const goal = goals?.[0]
  if (!goal) return null

  return {
    id: goal.id,
    goalText: goal.goal_text,
    roadmap: goal.roadmap,
    filters: goal.filters,
    createdAt: goal.created_at,
  }
}

// ============================================================================
// CREATE / UPDATE GOAL
// ============================================================================

export async function createGoal(goalText: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  await (supabase.from("user_goals") as any)
    .update({ is_active: false })
    .eq("user_id", authUser.id)
    .eq("is_active", true)

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

  const { data: goalData, error } = await (supabase.from("user_goals") as any)
    .insert({
      user_id: authUser.id,
      goal_text: goalText,
      roadmap,
      filters,
      is_active: true,
    })
    .select()
    .single()

  const goal = goalData as UserGoal | null

  if (error || !goal) {
    console.error("[createGoal]", error)
    throw new Error("Failed to create goal")
  }

  try {
    triggerDiscovery(goalText).catch(console.error)
  } catch (e) {
  }

  revalidatePath("/dashboard")
  revalidatePath("/opportunities")

  return {
    id: goal.id,
    goalText: goal.goal_text,
    roadmap: goal.roadmap,
    filters: goal.filters,
  }
}

export async function updateGoal(goalId: string, goalText: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data, error: fetchError } = await supabase
    .from("user_goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", authUser.id)
    .single()

  const existing = data as UserGoal | null

  if (fetchError || !existing) throw new Error("Goal not found")

  const { data: updatedGoalData, error: updateError } = await (supabase.from("user_goals") as any)
    .update({
      goal_text: goalText,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId)
    .select()
    .single()

  const updatedGoal = updatedGoalData as UserGoal | null

  if (updateError || !updatedGoal) {
    console.error("[updateGoal]", updateError)
    throw new Error("Failed to update goal")
  }

  revalidatePath("/dashboard")
  revalidatePath("/opportunities")

  return {
    id: updatedGoal.id,
    goalText: updatedGoal.goal_text,
    roadmap: updatedGoal.roadmap,
    filters: updatedGoal.filters,
  }
}

export async function deleteGoal(goalId: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { error } = await supabase
    .from("user_goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", authUser.id)

  if (error) {
    console.error("[deleteGoal]", error)
    throw new Error("Failed to delete goal")
  }

  revalidatePath("/dashboard")
  return { success: true }
}

// ============================================================================
// ROADMAP PROGRESS
// ============================================================================

export async function getRoadmapProgress() {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data, error: goalError } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", authUser.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  const goal = data as UserGoal | null

  if (goalError || !goal) return null

  const { data: userData } = await supabase
    .from("users")
    .select("skills")
    .eq("id", authUser.id)
    .single()

  const user = userData as User | null

  const { count: savedCount } = await supabase
    .from("user_opportunities")
    .select("*", { count: "exact", head: true })
    .eq("user_id", authUser.id)
    .in("status", ["saved", "applied"])

  const { count: appliedCount } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", authUser.id)

  let progress = 0
  if ((savedCount || 0) > 0) progress += 25
  const userSkills = user?.skills as string[] | null
  if (userSkills && userSkills.length > 3) progress += 25
  if ((appliedCount || 0) > 0) progress += 25
  if ((appliedCount || 0) > 3) progress += 25

  return {
    goalText: goal.goal_text,
    progress: Math.min(100, progress),
    savedCount: savedCount || 0,
    appliedCount: appliedCount || 0,
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
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data, error } = await supabase
    .from("profile_goals")
    .select("*")
    .eq("user_id", authUser.id)
    .order("status", { ascending: true })
    .order("target_date", { ascending: true })

  const goals = data as ProfileGoal[] | null

  if (error) {
    console.error("[getProfileGoals]", error)
    return []
  }

  return (goals || []).map(
    (g: ProfileGoal) => ({
      id: g.id,
      title: g.title,
      targetDate: new Date(g.target_date).toISOString().split("T")[0],
      status: g.status as ProfileGoalStatus,
      createdAt: g.created_at,
    })
  )
}

export async function addProfileGoal(data: {
  title: string
  targetDate: string
  status?: ProfileGoalStatus
}) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  if (!data.title || data.title.length > 100) {
    throw new Error("Invalid goal title")
  }

  const { data: goalData, error } = await (supabase.from("profile_goals") as any)
    .insert({
      user_id: authUser.id,
      title: data.title.trim(),
      target_date: new Date(data.targetDate).toISOString(),
      status: data.status || "pending",
    })
    .select()
    .single()

  const goal = goalData as ProfileGoal | null

  if (error || !goal) {
    console.error("[addProfileGoal]", error)
    throw new Error("Failed to add profile goal")
  }

  revalidatePath("/profile")
  revalidatePath("/opportunities")
  revalidatePath("/analytics")

  return {
    id: goal.id,
    title: goal.title,
    targetDate: new Date(goal.target_date).toISOString().split("T")[0],
    status: goal.status as ProfileGoalStatus,
    createdAt: goal.created_at,
  }
}

export async function updateProfileGoal(
  id: string,
  data: Partial<{ title: string; targetDate: string; status: ProfileGoalStatus }>
) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: existingData, error: fetchError } = await supabase
    .from("profile_goals")
    .select("*")
    .eq("id", id)
    .eq("user_id", authUser.id)
    .single()

  const existing = existingData as ProfileGoal | null

  if (fetchError || !existing) throw new Error("Goal not found")

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title.trim()
  if (data.targetDate !== undefined) updateData.target_date = new Date(data.targetDate).toISOString()
  if (data.status !== undefined) updateData.status = data.status

  const { data: goalData, error: updateError } = await (supabase.from("profile_goals") as any)
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  const goal = goalData as ProfileGoal | null

  if (updateError || !goal) {
    console.error("[updateProfileGoal]", updateError)
    throw new Error("Failed to update profile goal")
  }

  revalidatePath("/profile")
  revalidatePath("/opportunities")
  revalidatePath("/analytics")

  return {
    id: goal.id,
    title: goal.title,
    targetDate: new Date(goal.target_date).toISOString().split("T")[0],
    status: goal.status as ProfileGoalStatus,
    createdAt: goal.created_at,
  }
}

export async function updateProfileGoalStatus(id: string, status: ProfileGoalStatus) {
  return updateProfileGoal(id, { status })
}

export async function deleteProfileGoal(id: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: existing, error: fetchError } = await supabase
    .from("profile_goals")
    .select("*")
    .eq("id", id)
    .eq("user_id", authUser.id)
    .single()

  if (fetchError || !existing) throw new Error("Goal not found")

  const { error } = await supabase
    .from("profile_goals")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[deleteProfileGoal]", error)
    throw new Error("Failed to delete profile goal")
  }

  revalidatePath("/profile")
  revalidatePath("/opportunities")
  revalidatePath("/analytics")

  return { success: true }
}

export async function getProfileGoalsProgress() {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data, error } = await supabase
    .from("profile_goals")
    .select("status")
    .eq("user_id", authUser.id)

  const goals = data as { status: string }[] | null

  if (error || !goals) {
    return { total: 0, completed: 0, inProgress: 0, pending: 0, percentage: 0 }
  }

  const total = goals.length
  const completed = goals.filter((g: { status: string }) => g.status === "completed").length
  const inProgress = goals.filter((g: { status: string }) => g.status === "in_progress").length
  const pending = goals.filter((g: { status: string }) => g.status === "pending").length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, completed, inProgress, pending, percentage }
}
