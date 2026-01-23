"use server"

import { revalidatePath } from "next/cache"

import { createClient, getCurrentUser, requireAuth } from "@/lib/supabase/server"

// ============================================================================
// ENDORSE SKILL
// ============================================================================

export async function endorseSkill(endorseeId: string, skill: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  if (authUser.id === endorseeId) {
    throw new Error("Cannot endorse your own skills")
  }

  const { data: endorsee, error: endorseeError } = await supabase
    .from("users")
    .select("skills")
    .eq("id", endorseeId)
    .single()

  if (endorseeError || !endorsee) throw new Error("User not found")

  if (!endorsee.skills.includes(skill)) {
    throw new Error("User does not have this skill listed")
  }

  const { data: existing } = await supabase
    .from("skill_endorsements")
    .select("id")
    .eq("endorser_id", authUser.id)
    .eq("endorsee_id", endorseeId)
    .eq("skill", skill)
    .single()

  if (existing) {
    return { alreadyEndorsed: true }
  }

  const { data: endorsement, error: insertError } = await supabase
    .from("skill_endorsements")
    .insert({
      endorser_id: authUser.id,
      endorsee_id: endorseeId,
      skill,
    })
    .select()
    .single()

  if (insertError) {
    console.error("[endorseSkill]", insertError)
    throw new Error("Failed to endorse skill")
  }

  revalidatePath("/profile")
  return endorsement
}

// ============================================================================
// REMOVE ENDORSEMENT
// ============================================================================

export async function removeEndorsement(endorseeId: string, skill: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { error } = await supabase
    .from("skill_endorsements")
    .delete()
    .eq("endorser_id", authUser.id)
    .eq("endorsee_id", endorseeId)
    .eq("skill", skill)

  if (error) {
    console.error("[removeEndorsement]", error)
    throw new Error("Failed to remove endorsement")
  }

  revalidatePath("/profile")
  return { success: true }
}

// ============================================================================
// GET SKILL ENDORSEMENTS
// ============================================================================

export async function getSkillEndorsements(userId: string) {
  const supabase = await createClient()

  const { data: endorsements, error } = await supabase
    .from("skill_endorsements")
    .select(
      `
      *,
      endorser:users!skill_endorsements_endorser_id_fkey(id, name, avatar, headline)
    `
    )
    .eq("endorsee_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getSkillEndorsements]", error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupedBySkill: Record<string, any[]> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(endorsements || []).forEach((endorsement: any) => {
    if (!groupedBySkill[endorsement.skill]) {
      groupedBySkill[endorsement.skill] = []
    }
    groupedBySkill[endorsement.skill].push({
      id: endorsement.id,
      endorser: {
        id: endorsement.endorser?.id,
        name: endorsement.endorser?.name,
        avatar: endorsement.endorser?.avatar,
        headline: endorsement.endorser?.headline,
      },
      createdAt: endorsement.created_at,
    })
  })

  const skillEndorsements = Object.entries(groupedBySkill).map(
    ([skill, endorsers]) => ({
      skill,
      count: endorsers.length,
      endorsers,
    })
  )

  skillEndorsements.sort((a, b) => b.count - a.count)

  return skillEndorsements
}

// ============================================================================
// GET MY ENDORSEMENTS (given by me)
// ============================================================================

export async function getMyEndorsements() {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: endorsements, error } = await supabase
    .from("skill_endorsements")
    .select(
      `
      *,
      endorsee:users!skill_endorsements_endorsee_id_fkey(id, name, avatar, headline)
    `
    )
    .eq("endorser_id", authUser.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getMyEndorsements]", error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (endorsements || []).map((e: any) => ({
    id: e.id,
    skill: e.skill,
    endorsee: e.endorsee,
    createdAt: e.created_at,
  }))
}

// ============================================================================
// CHECK IF ENDORSED
// ============================================================================

export async function hasEndorsed(endorseeId: string, skill: string) {
  const supabase = await createClient()
  const authUser = await getCurrentUser()
  if (!authUser) return false

  const { data: endorsement } = await supabase
    .from("skill_endorsements")
    .select("id")
    .eq("endorser_id", authUser.id)
    .eq("endorsee_id", endorseeId)
    .eq("skill", skill)
    .single()

  return !!endorsement
}
