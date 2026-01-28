"use server"

import { createClient, getCurrentUser } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type OpportunityStatus = "interested" | "applied" | "interviewing" | "rejected" | "offer" | "dismissed"

export async function updateStatus(opportunityId: string, status: OpportunityStatus | null) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) throw new Error("Unauthorized")

  // Check if activity exists
  const { data: existing } = await supabase
    .from("user_activities")
    .select("id, metadata")
    .eq("user_id", user.id)
    .eq("type", "opportunity_status")
    .contains("metadata", { opportunity_id: opportunityId })
    .single()

  if (status === null) {
    // Remove status
    if (existing) {
      await supabase.from("user_activities").delete().eq("id", existing.id)
    }
  } else {
    // Upsert status
    const metadata = {
      opportunity_id: opportunityId,
      status,
      updated_at: new Date().toISOString()
    }

    if (existing) {
      await supabase
        .from("user_activities")
        .update({ metadata })
        .eq("id", existing.id)
    } else {
      await supabase.from("user_activities").insert({
        user_id: user.id,
        type: "opportunity_status",
        metadata
      })
    }
  }

  revalidatePath("/opportunities")
  return { success: true }
}

export async function getStatuses() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) return {}

  const { data } = await supabase
    .from("user_activities")
    .select("metadata")
    .eq("user_id", user.id)
    .eq("type", "opportunity_status")

  const statuses: Record<string, OpportunityStatus> = {}
  
  data?.forEach((activity: any) => {
    if (activity.metadata?.opportunity_id && activity.metadata?.status) {
      statuses[activity.metadata.opportunity_id] = activity.metadata.status
    }
  })

  return statuses
}
