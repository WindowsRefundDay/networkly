"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient, requireAuth } from "@/lib/supabase/server"

// ============================================================================
// PREFERENCES SCHEMA
// ============================================================================

const preferencesSchema = z.object({
  notifyOpportunities: z.boolean().optional(),
  notifyConnections: z.boolean().optional(),
  notifyMessages: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  publicProfile: z.boolean().optional(),
  showActivityStatus: z.boolean().optional(),
  showProfileViews: z.boolean().optional(),
  aiSuggestions: z.boolean().optional(),
  autoIcebreakers: z.boolean().optional(),
  careerNudges: z.boolean().optional(),
})

export type UserPreferencesInput = z.infer<typeof preferencesSchema>

// ============================================================================
// GET PREFERENCES
// ============================================================================

export async function getPreferences() {
  const supabase = await createClient()
  const authUser = await requireAuth()

  let { data: preferences, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", authUser.id)
    .single()

  if (error || !preferences) {
    const { data: newPreferences, error: insertError } = await supabase
      .from("user_preferences")
      .insert({ user_id: authUser.id })
      .select()
      .single()

    if (insertError) {
      console.error("[getPreferences]", insertError)
      throw new Error("Failed to create preferences")
    }
    preferences = newPreferences
  }

  return {
    id: preferences.id,
    notifyOpportunities: preferences.notify_opportunities,
    notifyConnections: preferences.notify_connections,
    notifyMessages: preferences.notify_messages,
    weeklyDigest: preferences.weekly_digest,
    publicProfile: preferences.public_profile,
    showActivityStatus: preferences.show_activity_status,
    showProfileViews: preferences.show_profile_views,
    aiSuggestions: preferences.ai_suggestions,
    autoIcebreakers: preferences.auto_icebreakers,
    careerNudges: preferences.career_nudges,
  }
}

// ============================================================================
// UPDATE PREFERENCES
// ============================================================================

export async function updatePreferences(data: UserPreferencesInput) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const validatedData = preferencesSchema.parse(data)

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (validatedData.notifyOpportunities !== undefined)
    updateData.notify_opportunities = validatedData.notifyOpportunities
  if (validatedData.notifyConnections !== undefined)
    updateData.notify_connections = validatedData.notifyConnections
  if (validatedData.notifyMessages !== undefined)
    updateData.notify_messages = validatedData.notifyMessages
  if (validatedData.weeklyDigest !== undefined)
    updateData.weekly_digest = validatedData.weeklyDigest
  if (validatedData.publicProfile !== undefined)
    updateData.public_profile = validatedData.publicProfile
  if (validatedData.showActivityStatus !== undefined)
    updateData.show_activity_status = validatedData.showActivityStatus
  if (validatedData.showProfileViews !== undefined)
    updateData.show_profile_views = validatedData.showProfileViews
  if (validatedData.aiSuggestions !== undefined)
    updateData.ai_suggestions = validatedData.aiSuggestions
  if (validatedData.autoIcebreakers !== undefined)
    updateData.auto_icebreakers = validatedData.autoIcebreakers
  if (validatedData.careerNudges !== undefined)
    updateData.career_nudges = validatedData.careerNudges

  const { data: preferences, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: authUser.id,
        ...updateData,
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single()

  if (error || !preferences) {
    console.error("[updatePreferences]", error)
    throw new Error("Failed to update preferences")
  }

  revalidatePath("/settings")
  return preferences
}

// ============================================================================
// RESET PREFERENCES TO DEFAULT
// ============================================================================

export async function resetPreferences() {
  const supabase = await createClient()
  const authUser = await requireAuth()

  await supabase.from("user_preferences").delete().eq("user_id", authUser.id)

  const { data: preferences, error } = await supabase
    .from("user_preferences")
    .insert({ user_id: authUser.id })
    .select()
    .single()

  if (error || !preferences) {
    console.error("[resetPreferences]", error)
    throw new Error("Failed to reset preferences")
  }

  revalidatePath("/settings")
  return preferences
}
