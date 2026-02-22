"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient, getCurrentUser, requireAuth } from "@/lib/supabase/server"
import type { AppEvent, EventRegistration } from "@/lib/types"

// ============================================================================
// GET EVENTS
// ============================================================================

export async function getEvents() {
  const supabase = await createClient()
  const authUser = await getCurrentUser()

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })

  const events = data as AppEvent[] | null

  if (error) {
    console.error("[getEvents]", error)
    return []
  }

  if (!authUser) {
    return (events || []).map(
      (event: AppEvent) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        location: event.location,
        type: event.type,
        attendees: event.attendees,
        image: event.image,
        description: event.description,
        matchScore: event.match_score,
        registered: false,
        registrationStatus: null,
      })
    )
  }

  const { data: registrationsData } = await supabase
    .from("event_registrations")
    .select("event_id, status")
    .eq("user_id", authUser.id)

  const registrations = registrationsData as { event_id: string; status: string }[] | null

  const registrationMap = new Map(
    (registrations || []).map((r: { event_id: string; status: string }) => [r.event_id, r.status])
  )

  return (events || []).map(
    (event: AppEvent) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      location: event.location,
      type: event.type,
      attendees: event.attendees,
      image: event.image,
      description: event.description,
      matchScore: event.match_score,
      registered: registrationMap.has(event.id),
      registrationStatus: registrationMap.get(event.id) || null,
    })
  )
}

// ============================================================================
// GET EVENT BY ID
// ============================================================================

export async function getEventById(id: string) {
  const supabase = await createClient()
  const authUser = await getCurrentUser()

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single()

  const event = data as AppEvent | null

  if (error || !event) return null

  let registrationStatus = null
  if (authUser) {
    const { data: registrationData } = await supabase
      .from("event_registrations")
      .select("status")
      .eq("event_id", id)
      .eq("user_id", authUser.id)
      .maybeSingle()

    const registration = registrationData as EventRegistration | null

    registrationStatus = registration?.status || null
  }

  return {
    id: event.id,
    title: event.title,
    date: event.date,
    location: event.location,
    type: event.type,
    attendees: event.attendees,
    image: event.image,
    description: event.description,
    matchScore: event.match_score,
    registered: !!registrationStatus,
    registrationStatus,
  }
}

// ============================================================================
// CREATE EVENT (Admin)
// ============================================================================

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.string().min(1),
  location: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  attendees: z.number().int().min(0).optional(),
  image: z.string().url().optional().or(z.literal("")),
  description: z.string().max(5000).optional(),
  matchScore: z.number().int().min(0).max(100).optional(),
})

export async function createEvent(data: z.infer<typeof createEventSchema>) {
  const supabase = await createClient()
  await requireAuth()

  const validatedData = createEventSchema.parse(data)

  const { data: eventData, error } = await supabase
    .from("events")
    .insert({
      title: validatedData.title,
      date: validatedData.date,
      location: validatedData.location,
      type: validatedData.type,
      attendees: validatedData.attendees || 0,
      image: validatedData.image || null,
      description: validatedData.description || null,
      match_score: validatedData.matchScore || 0,
    } as any)
    .select()
    .single()

  const event = eventData as AppEvent | null

  if (error || !event) {
    console.error("[createEvent]", error)
    throw new Error("Failed to create event")
  }

  revalidatePath("/events")
  return event
}

// ============================================================================
// REGISTER FOR EVENT
// ============================================================================

export async function registerForEvent(eventId: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single()

  const event = data as AppEvent | null

  if (eventError || !event) throw new Error("Event not found")

  const { data: existingRegData } = await supabase
    .from("event_registrations")
    .select("id")
    .eq("user_id", authUser.id)
    .eq("event_id", eventId)
    .maybeSingle()

  const existingReg = existingRegData as EventRegistration | null

  const isNewRegistration = !existingReg

  const { error: upsertError } = await supabase
    .from("event_registrations")
    .upsert(
      {
        user_id: authUser.id,
        event_id: eventId,
        status: "registered",
        updated_at: new Date().toISOString(),
      } as any,
      {
        onConflict: "user_id,event_id",
      }
    )

  if (upsertError) {
    console.error("[registerForEvent]", upsertError)
    throw new Error("Failed to register for event")
  }

  if (isNewRegistration) {
    await (supabase.from("events") as any)
      .update({ attendees: event.attendees + 1 })
      .eq("id", eventId)
  }

  revalidatePath("/events")
  return { success: true }
}

// ============================================================================
// UNREGISTER FROM EVENT
// ============================================================================

export async function unregisterFromEvent(eventId: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { error: deleteError } = await supabase
    .from("event_registrations")
    .delete()
    .eq("user_id", authUser.id)
    .eq("event_id", eventId)

  if (deleteError) {
    console.error("[unregisterFromEvent]", deleteError)
    throw new Error("Failed to unregister from event")
  }

  const { data: eventData } = await supabase
    .from("events")
    .select("attendees")
    .eq("id", eventId)
    .single()

  const event = eventData as AppEvent | null

  if (event && event.attendees > 0) {
    await (supabase.from("events") as any)
      .update({ attendees: event.attendees - 1 })
      .eq("id", eventId)
  }

  revalidatePath("/events")
  return { success: true }
}

// ============================================================================
// GET MY REGISTRATIONS
// ============================================================================

export async function getMyRegistrations() {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: registrations, error } = await supabase
    .from("event_registrations")
    .select(
      `
      *,
      events(*)
    `
    )
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getMyRegistrations]", error)
    throw new Error("Failed to get registrations")
  }

  return (registrations || []).map((reg: any) => ({
    id: reg.id,
    status: reg.status,
    registeredAt: reg.created_at,
    event: reg.events
      ? {
        id: reg.events.id,
        title: reg.events.title,
        date: reg.events.date,
        location: reg.events.location,
        type: reg.events.type,
        attendees: reg.events.attendees,
        image: reg.events.image,
      }
      : null,
  }))
}
