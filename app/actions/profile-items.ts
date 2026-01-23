"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient, requireAuth } from "@/lib/supabase/server"

// ============================================================================
// ACHIEVEMENT ACTIONS
// ============================================================================

const ACHIEVEMENT_CATEGORIES = ["Academic", "Athletic", "Service", "Arts", "Other"] as const

const achievementSchema = z.object({
  title: z.string().min(1).max(50),
  category: z.enum(ACHIEVEMENT_CATEGORIES).optional().default("Academic"),
  description: z.string().max(150).optional(),
  date: z.string().min(1),
  icon: z.enum(["trophy", "award", "star"]).default("trophy"),
})

export async function addAchievement(data: z.infer<typeof achievementSchema>) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const validatedData = achievementSchema.parse(data)

  const { data: achievement, error } = await supabase
    .from("achievements")
    .insert({
      title: validatedData.title,
      category: validatedData.category,
      description: validatedData.description || null,
      date: validatedData.date,
      icon: validatedData.icon,
      user_id: authUser.id,
    })
    .select()
    .single()

  if (error || !achievement) {
    console.error("[addAchievement]", error)
    throw new Error("Failed to add achievement")
  }

  revalidatePath("/profile")
  return achievement
}

export async function updateAchievement(
  id: string,
  data: Partial<z.infer<typeof achievementSchema>>
) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: existing, error: fetchError } = await supabase
    .from("achievements")
    .select("*")
    .eq("id", id)
    .eq("user_id", authUser.id)
    .single()

  if (fetchError || !existing) throw new Error("Achievement not found")

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.category !== undefined) updateData.category = data.category
  if (data.description !== undefined) updateData.description = data.description || null
  if (data.date !== undefined) updateData.date = data.date
  if (data.icon !== undefined) updateData.icon = data.icon

  const { data: achievement, error: updateError } = await supabase
    .from("achievements")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (updateError || !achievement) {
    console.error("[updateAchievement]", updateError)
    throw new Error("Failed to update achievement")
  }

  revalidatePath("/profile")
  return achievement
}

export async function deleteAchievement(id: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: existing, error: fetchError } = await supabase
    .from("achievements")
    .select("*")
    .eq("id", id)
    .eq("user_id", authUser.id)
    .single()

  if (fetchError || !existing) throw new Error("Achievement not found")

  const { error } = await supabase
    .from("achievements")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[deleteAchievement]", error)
    throw new Error("Failed to delete achievement")
  }

  revalidatePath("/profile")
  return { success: true }
}

// ============================================================================
// EXTRACURRICULAR ACTIONS
// ============================================================================

const extracurricularSchema = z.object({
  title: z.string().min(1).max(100),
  organization: z.string().min(1).max(100),
  type: z.enum(["Research", "Leadership", "Technical", "Volunteer", "Other"]),
  startDate: z.string().min(1).max(50),
  endDate: z.string().min(1).max(50),
  description: z.string().max(1000).optional(),
  logo: z.string().url().optional().or(z.literal("")),
})

export async function addExtracurricular(data: z.infer<typeof extracurricularSchema>) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const validatedData = extracurricularSchema.parse(data)

  const { data: extracurricular, error } = await supabase
    .from("extracurriculars")
    .insert({
      title: validatedData.title,
      organization: validatedData.organization,
      type: validatedData.type,
      start_date: validatedData.startDate,
      end_date: validatedData.endDate,
      description: validatedData.description || null,
      logo: validatedData.logo || null,
      user_id: authUser.id,
    })
    .select()
    .single()

  if (error || !extracurricular) {
    console.error("[addExtracurricular]", error)
    throw new Error("Failed to add extracurricular")
  }

  revalidatePath("/profile")
  return extracurricular
}

export async function updateExtracurricular(
  id: string,
  data: Partial<z.infer<typeof extracurricularSchema>>
) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: existing, error: fetchError } = await supabase
    .from("extracurriculars")
    .select("*")
    .eq("id", id)
    .eq("user_id", authUser.id)
    .single()

  if (fetchError || !existing) throw new Error("Extracurricular not found")

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.organization !== undefined) updateData.organization = data.organization
  if (data.type !== undefined) updateData.type = data.type
  if (data.startDate !== undefined) updateData.start_date = data.startDate
  if (data.endDate !== undefined) updateData.end_date = data.endDate
  if (data.description !== undefined) updateData.description = data.description || null
  if (data.logo !== undefined) updateData.logo = data.logo || null

  const { data: extracurricular, error: updateError } = await supabase
    .from("extracurriculars")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (updateError || !extracurricular) {
    console.error("[updateExtracurricular]", updateError)
    throw new Error("Failed to update extracurricular")
  }

  revalidatePath("/profile")
  return extracurricular
}

export async function deleteExtracurricular(id: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: existing, error: fetchError } = await supabase
    .from("extracurriculars")
    .select("*")
    .eq("id", id)
    .eq("user_id", authUser.id)
    .single()

  if (fetchError || !existing) throw new Error("Extracurricular not found")

  const { error } = await supabase
    .from("extracurriculars")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[deleteExtracurricular]", error)
    throw new Error("Failed to delete extracurricular")
  }

  revalidatePath("/profile")
  return { success: true }
}

// ============================================================================
// SKILLS & INTERESTS ACTIONS
// ============================================================================

export async function addSkill(skill: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  if (!skill || skill.length > 50) {
    throw new Error("Invalid skill")
  }

  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("skills")
    .eq("id", authUser.id)
    .single()

  if (fetchError || !user) throw new Error("User not found")

  if (user.skills.includes(skill)) {
    throw new Error("Skill already exists")
  }

  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({ skills: [...user.skills, skill] })
    .eq("id", authUser.id)
    .select("skills")
    .single()

  if (updateError || !updatedUser) {
    console.error("[addSkill]", updateError)
    throw new Error("Failed to add skill")
  }

  revalidatePath("/profile")
  return updatedUser.skills
}

export async function removeSkill(skill: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("skills")
    .eq("id", authUser.id)
    .single()

  if (fetchError || !user) throw new Error("User not found")

  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({ skills: user.skills.filter((s: string) => s !== skill) })
    .eq("id", authUser.id)
    .select("skills")
    .single()

  if (updateError || !updatedUser) {
    console.error("[removeSkill]", updateError)
    throw new Error("Failed to remove skill")
  }

  revalidatePath("/profile")
  return updatedUser.skills
}

export async function addInterest(interest: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  if (!interest || interest.length > 50) {
    throw new Error("Invalid interest")
  }

  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("interests")
    .eq("id", authUser.id)
    .single()

  if (fetchError || !user) throw new Error("User not found")

  if (user.interests.includes(interest)) {
    throw new Error("Interest already exists")
  }

  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({ interests: [...user.interests, interest] })
    .eq("id", authUser.id)
    .select("interests")
    .single()

  if (updateError || !updatedUser) {
    console.error("[addInterest]", updateError)
    throw new Error("Failed to add interest")
  }

  revalidatePath("/profile")
  return updatedUser.interests
}

export async function removeInterest(interest: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("interests")
    .eq("id", authUser.id)
    .single()

  if (fetchError || !user) throw new Error("User not found")

  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({ interests: user.interests.filter((i: string) => i !== interest) })
    .eq("id", authUser.id)
    .select("interests")
    .single()

  if (updateError || !updatedUser) {
    console.error("[removeInterest]", updateError)
    throw new Error("Failed to remove interest")
  }

  revalidatePath("/profile")
  return updatedUser.interests
}

// ============================================================================
// BIO UPDATE ACTION
// ============================================================================

export async function updateBio(bio: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  if (bio.length > 5000) {
    throw new Error("Bio too long")
  }

  const { data: user, error } = await supabase
    .from("users")
    .update({ bio })
    .eq("id", authUser.id)
    .select("bio")
    .single()

  if (error || !user) {
    console.error("[updateBio]", error)
    throw new Error("Failed to update bio")
  }

  revalidatePath("/profile")
  return user.bio
}
