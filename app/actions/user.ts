"use server"

import { cache } from "react"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient, requireAuth, getCurrentUser as getAuthUser } from "@/lib/supabase/server"
import type { User, Achievement, Extracurricular, AppEvent } from "@/lib/types"

async function fetchCurrentUser() {
  const authUser = await getAuthUser()
  if (!authUser) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("users")
    .select(
      `
            *,
            achievements (*),
            extracurriculars (*),
            analytics_data (*)
        `
    )
    .eq("id", authUser.id)
    .single()

  const user = data as any | null

  if (error || !user) return null

  const analyticsData = Array.isArray(user.analytics_data) ? user.analytics_data[0] : user.analytics_data

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    headline: user.headline,
    bio: user.bio,
    location: user.location,
    university: user.university,
    graduationYear: user.graduation_year?.toString() || null,
    skills: user.skills,
    interests: user.interests,
    connections: user.connections,
    profileViews: user.profile_views,
    searchAppearances: user.search_appearances,
    completedProjects: user.completed_projects,
    linkedinUrl: user.linkedin_url || null,
    githubUrl: user.github_url || null,
    portfolioUrl: user.portfolio_url || null,
    achievements: (user.achievements || []).map((a: Achievement) => ({
      id: a.id,
      title: a.title,
      date: a.date,
      icon: a.icon,
    })),
    extracurriculars: (user.extracurriculars || []).map(
      (e: Extracurricular) => ({
        id: e.id,
        title: e.title,
        organization: e.organization,
        type: e.type,
        startDate: e.start_date,
        endDate: e.end_date,
        description: e.description,
        logo: e.logo,
      })
    ),
    analyticsData: analyticsData || null,
  }
}

export const getCurrentUser = cache(fetchCurrentUser)

export async function ensureUserRecord() {
  const authUser = await getAuthUser()

  if (!authUser) return null

  const supabase = await createClient()

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUser.id)
    .maybeSingle()

  if (existingUser) {
    return existingUser
  }

  const fallbackName = authUser.email?.split("@")[0] || "User"

  const { data: createdUser, error } = await supabase
    .from("users")
    .insert({
      id: authUser.id,
      email: authUser.email!,
      name: (authUser as any).user_metadata?.full_name || fallbackName,
      avatar: (authUser as any).user_metadata?.avatar_url,
    } as any)
    .select("id")
    .single()

  if (error) throw new Error(error.message)

  return createdUser as any
}

export async function getUserAnalytics() {
  const authUser = await getAuthUser()
  if (!authUser) return null

  const supabase = await createClient()

  const { data: analyticsData } = await supabase
    .from("analytics_data")
    .select("*")
    .eq("user_id", authUser.id)
    .single()

  const ad = analyticsData as any | null

  if (!ad) {
    return {
      profileViews: [],
      networkGrowth: [],
      skillEndorsements: [],
    }
  }

  return {
    profileViews: ad.profile_views as { date: string; views: number }[],
    networkGrowth: ad.network_growth as { month: string; connections: number }[],
    skillEndorsements: ad.skill_endorsements as { skill: string; count: number }[],
  }
}

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
  const authUser = await requireAuth()
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.headline !== undefined) updateData.headline = data.headline
  if (data.bio !== undefined) updateData.bio = data.bio
  if (data.location !== undefined) updateData.location = data.location
  if (data.university !== undefined) updateData.university = data.university
  if (data.graduationYear !== undefined) updateData.graduation_year = data.graduationYear
  if (data.skills !== undefined) updateData.skills = data.skills
  if (data.interests !== undefined) updateData.interests = data.interests

  const { data: user, error } = await (supabase.from("users") as any)
    .update(updateData)
    .eq("id", authUser.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return user as any
}

export async function getEvents() {
  const supabase = await createClient()

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })

  const eventsData = events as AppEvent[] | null

  if (error) throw new Error(error.message)

  return (eventsData || []).map((event: AppEvent) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    location: event.location,
    type: event.type,
    attendees: event.attendees,
    image: event.image,
  }))
}

export async function getUserProfile() {
  const authUser = await getAuthUser()
  const supabase = await createClient()

  if (!authUser) return null

  const { data: userProfileData, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", authUser.id)
    .maybeSingle()

  const userProfile = userProfileData as any | null

  if (error || !userProfile) return null

  return {
    id: userProfile.id,
    user_id: userProfile.user_id,
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

// ============================================================================
// USER PROFILE DETAILS UPDATE ACTION
// ============================================================================

const userProfileDetailsSchema = z.object({
  school: z.string().max(100).optional().nullable(),
  grade_level: z.number().int().min(9).max(12).optional().nullable(),
  interests: z.array(z.string().max(50)).max(20).optional(),
  location: z.string().max(100).optional().nullable(),
  career_goals: z.string().max(500).optional().nullable(),
  preferred_opportunity_types: z.array(z.string()).max(10).optional(),
  academic_strengths: z.array(z.string()).max(15).optional(),
  availability: z.string().max(50).optional().nullable(),
})

export type UpdateUserProfileDetailsInput = z.infer<typeof userProfileDetailsSchema>

export async function updateUserProfileDetails(data: UpdateUserProfileDetailsInput) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const validatedData = userProfileDetailsSchema.parse(data)

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", authUser.id)
    .maybeSingle()

  const profileData = {
    user_id: authUser.id,
    school: validatedData.school ?? null,
    grade_level: validatedData.grade_level ?? null,
    interests: validatedData.interests ?? [],
    location: validatedData.location ?? null,
    career_goals: validatedData.career_goals ?? null,
    preferred_opportunity_types: validatedData.preferred_opportunity_types ?? [],
    academic_strengths: validatedData.academic_strengths ?? [],
    availability: validatedData.availability ?? null,
    updated_at: new Date().toISOString(),
  }

  let result
  if (existingProfile) {
    // Update existing profile
    const { data: updated, error } = await (supabase.from("user_profiles") as any)
      .update(profileData)
      .eq("user_id", authUser.id)
      .select()
      .single()

    if (error) {
      console.error("[updateUserProfileDetails] Update error:", error)
      throw new Error("Failed to update profile details")
    }
    result = updated
  } else {
    // Insert new profile
    const { data: inserted, error } = await (supabase.from("user_profiles") as any)
      .insert(profileData)
      .select()
      .single()

    if (error) {
      console.error("[updateUserProfileDetails] Insert error:", error)
      throw new Error("Failed to create profile details")
    }
    result = inserted
  }

  revalidatePath("/profile")
  revalidatePath("/opportunities")
  return result as any
}
