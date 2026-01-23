"use server"

import { revalidatePath } from "next/cache"

import { createClient, requireAuth } from "@/lib/supabase/server"

// ============================================================================
// GET APPLICATIONS
// ============================================================================

export async function getApplications() {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: applications, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", authUser.id)
    .order("applied_date", { ascending: false })

  if (error) {
    console.error("[getApplications]", error)
    throw new Error("Failed to get applications")
  }

  return (applications || []).map(
    (app: {
      id: string
      company: string
      position: string
      status: string
      applied_date: string
      next_step: string | null
    }) => ({
      id: app.id,
      company: app.company,
      position: app.position,
      status: app.status,
      appliedDate: formatDate(new Date(app.applied_date)),
      nextStep: app.next_step,
    })
  )
}

// ============================================================================
// CREATE APPLICATION
// ============================================================================

export async function createApplication(data: {
  company: string
  position: string
  status?: string
  nextStep?: string
}) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: application, error } = await supabase
    .from("applications")
    .insert({
      company: data.company,
      position: data.position,
      status: data.status || "Applied",
      next_step: data.nextStep || "Application submitted",
      user_id: authUser.id,
    })
    .select()
    .single()

  if (error || !application) {
    console.error("[createApplication]", error)
    throw new Error("Failed to create application")
  }

  revalidatePath("/dashboard")
  return application
}

// ============================================================================
// UPDATE APPLICATION
// ============================================================================

export async function updateApplication(
  id: string,
  data: Partial<{
    status: string
    nextStep: string
  }>
) {
  const supabase = await createClient()
  await requireAuth()

  const updateData: Record<string, unknown> = {}
  if (data.status !== undefined) updateData.status = data.status
  if (data.nextStep !== undefined) updateData.next_step = data.nextStep

  const { data: application, error } = await supabase
    .from("applications")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error || !application) {
    console.error("[updateApplication]", error)
    throw new Error("Failed to update application")
  }

  revalidatePath("/dashboard")
  return application
}

// ============================================================================
// DELETE APPLICATION
// ============================================================================

export async function deleteApplication(id: string) {
  const supabase = await createClient()
  await requireAuth()

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[deleteApplication]", error)
    throw new Error("Failed to delete application")
  }

  revalidatePath("/dashboard")
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
