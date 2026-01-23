"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { checkRateLimit, createRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit"
import { createClient, requireAuth } from "@/lib/supabase/server"

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  headline: z.string().max(200).optional(),
  bio: z.string().max(5000).optional(),
  location: z.string().max(100).optional(),
  university: z.string().max(100).optional(),
  graduationYear: z.number().int().min(1900).max(2100).optional(),
  skills: z.array(z.string().max(50)).max(50).optional(),
  interests: z.array(z.string().max(50)).max(50).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  visibility: z.enum(["public", "private", "connections"]).optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export async function updateProfile(data: UpdateProfileInput) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const rateLimitKey = createRateLimitKey("PROFILE_UPDATE", authUser.id)
  const rateLimit = await checkRateLimit(
    rateLimitKey,
    RATE_LIMITS.PROFILE_UPDATE.limit,
    RATE_LIMITS.PROFILE_UPDATE.windowSeconds
  )

  if (!rateLimit.success) {
    throw new Error(
      `Rate limit exceeded. You can update your profile ${RATE_LIMITS.PROFILE_UPDATE.limit} times per hour. Try again later.`
    )
  }

  const validatedData = updateProfileSchema.parse(data)

  const updateData: Record<string, unknown> = {
    profile_updated_at: new Date().toISOString(),
  }

  if (validatedData.name !== undefined) updateData.name = validatedData.name
  if (validatedData.headline !== undefined) updateData.headline = validatedData.headline
  if (validatedData.bio !== undefined) updateData.bio = validatedData.bio
  if (validatedData.location !== undefined) updateData.location = validatedData.location
  if (validatedData.university !== undefined) updateData.university = validatedData.university
  if (validatedData.graduationYear !== undefined) updateData.graduation_year = validatedData.graduationYear
  if (validatedData.skills !== undefined) updateData.skills = validatedData.skills
  if (validatedData.interests !== undefined) updateData.interests = validatedData.interests
  if (validatedData.visibility !== undefined) updateData.visibility = validatedData.visibility

  updateData.linkedin_url = validatedData.linkedinUrl || null
  updateData.github_url = validatedData.githubUrl || null
  updateData.portfolio_url = validatedData.portfolioUrl || null

  const { data: user, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", authUser.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/profile")
  revalidatePath("/settings")
  return user
}

export async function getProfileByUserId(userId: string, viewerIp?: string) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { data: targetUser, error: targetError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single()

  if (targetError || !targetUser) return null

  const visibility = targetUser.visibility || "public"

  if (visibility === "private" && targetUser.id !== authUser.id) {
    return null
  }

  if (visibility === "connections" && targetUser.id !== authUser.id) {
    const { data: connection } = await supabase
      .from("connections")
      .select("id")
      .or(
        `and(requester_id.eq.${authUser.id},receiver_id.eq.${targetUser.id},status.eq.accepted),and(requester_id.eq.${targetUser.id},receiver_id.eq.${authUser.id},status.eq.accepted)`
      )
      .limit(1)
      .single()

    if (!connection) return null
  }

  if (targetUser.id !== authUser.id && visibility === "public") {
    const identifier = viewerIp || authUser.id
    const rateLimitKey = createRateLimitKey("PROFILE_VIEW", identifier, userId)
    const rateLimit = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.PROFILE_VIEW.limit,
      RATE_LIMITS.PROFILE_VIEW.windowSeconds
    )

    if (rateLimit.success) {
      await supabase
        .from("users")
        .update({
          profile_views: (targetUser.profile_views || 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq("id", userId)
    }
  }

  const { data: achievements } = await supabase
    .from("achievements")
    .select("id, title, date, icon")
    .eq("user_id", targetUser.id)

  const { data: extracurriculars } = await supabase
    .from("extracurriculars")
    .select("id, title, organization, type, start_date, end_date, description, logo")
    .eq("user_id", targetUser.id)

  const { data: recommendations } = await supabase
    .from("recommendations")
    .select("id, content, author_name, author_role, author_avatar, date, created_at")
    .eq("receiver_id", targetUser.id)
    .order("created_at", { ascending: false })

  return {
    id: targetUser.id,
    name: targetUser.name,
    avatar: targetUser.avatar,
    headline: targetUser.headline,
    bio: targetUser.bio,
    location: targetUser.location,
    university: targetUser.university,
    graduationYear: targetUser.graduation_year?.toString() || null,
    skills: targetUser.skills,
    interests: targetUser.interests,
    connections: targetUser.connections,
    profileViews: targetUser.profile_views,
    searchAppearances: targetUser.search_appearances,
    completedProjects: targetUser.completed_projects,
    visibility,
    linkedinUrl: targetUser.linkedin_url || null,
    githubUrl: targetUser.github_url || null,
    portfolioUrl: targetUser.portfolio_url || null,
    createdAt: targetUser.created_at,
    achievements: achievements || [],
    extracurriculars: (extracurriculars || []).map((e) => ({
      id: e.id,
      title: e.title,
      organization: e.organization,
      type: e.type,
      startDate: e.start_date,
      endDate: e.end_date,
      description: e.description,
      logo: e.logo,
    })),
    recommendationsReceived: (recommendations || []).map((r) => ({
      id: r.id,
      content: r.content,
      authorName: r.author_name,
      authorRole: r.author_role,
      authorAvatar: r.author_avatar,
      date: r.date,
      createdAt: r.created_at,
    })),
  }
}

export async function calculateProfileStrength(userId: string) {
  const supabase = await createClient()

  const { data: user } = await supabase
    .from("users")
    .select("*, achievements (*)")
    .eq("id", userId)
    .single()

  if (!user) return 0

  let score = 0
  const achievements = user.achievements || []
  const checks = [
    { field: user.name, weight: 5 },
    { field: user.headline, weight: 10 },
    { field: user.bio, weight: 10 },
    { field: user.avatar, weight: 5 },
    { field: user.location, weight: 5 },
    { field: user.university, weight: 5 },
    { field: user.graduation_year, weight: 5 },
    { field: user.skills.length > 0, weight: 15 },
    { field: user.skills.length >= 5, weight: 5 },
    { field: user.interests.length > 0, weight: 10 },
    { field: achievements.length > 0, weight: 5 },
    { field: user.linkedin_url, weight: 5 },
    { field: user.github_url, weight: 5 },
    { field: user.portfolio_url, weight: 5 },
  ]

  checks.forEach(({ field, weight }) => {
    if (field) score += weight
  })

  return Math.min(score, 100)
}

export async function updateProfileCompleteness() {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const strength = await calculateProfileStrength(authUser.id)

  await supabase
    .from("users")
    .update({ is_profile_complete: strength >= 80 })
    .eq("id", authUser.id)

  return strength
}
