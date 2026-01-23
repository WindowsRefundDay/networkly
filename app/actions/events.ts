"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient, getCurrentUser, requireAuth } from "@/lib/supabase/server"

// ============================================================================
// GET EVENTS
// ============================================================================

export async function getEvents() {
  const supabase = await createClient()
  const authUser = await getCurrentUser()

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getEvents]", error)
    return []
  }

  if (!authUser) {
    return (events || []).map(
      (event: {
        id: string
        title: string
        date: string
        location: string
        type: string
        attendees: number
        image: string | null
        description: string | null
        match_score: number
      }) => ({
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

  const { data: registrations } = await supabase
    .from("event_registrations")
    .select("event_id, status")
    .eq("user_id", authUser.id)

  const registrationMap = new Map(
    (registrations || []).map((r: { event_id: string; status: string }) => [r.event_id, r.status])
  )

  return (events || []).map(
    (event: {
      id: string
      title: string
      date: string
      location: string
      type: string
      attendees: number
      image: string | null
      description: string | null
      match_score: number
    }) => ({
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

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !event) return null

  let registrationStatus = null
  if (authUser) {
    const { data: registration } = await supabase
      .from("event_registrations")
      .select("status")
      .eq("event_id", id)
      .eq("user_id", authUser.id)
      .single()

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

  const { data: event, error } = await supabase
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
    })
    .select()
    .single()

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

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single()

  if (eventError || !event) throw new Error("Event not found")

  const { data: existingReg } = await supabase
    .from("event_registrations")
    .select("id")
    .eq("user_id", authUser.id)
    .eq("event_id", eventId)
    .single()

  const isNewRegistration = !existingReg

  const { error: upsertError } = await supabase
    .from("event_registrations")
    .upsert(
      {
        user_id: authUser.id,
        event_id: eventId,
        status: "registered",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,event_id",
      }
    )

  if (upsertError) {
    console.error("[registerForEvent]", upsertError)
    throw new Error("Failed to register for event")
  }

  if (isNewRegistration) {
    await supabase
      .from("events")
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

  const { data: event } = await supabase
    .from("events")
    .select("attendees")
    .eq("id", eventId)
    .single()

  if (event && event.attendees > 0) {
    await supabase
      .from("events")
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
