"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ============================================================================
// GET EVENTS
// ============================================================================

export async function getEvents() {
  const { userId: clerkId } = await auth()

  let dbUserId: string | null = null
  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })
    dbUserId = user?.id || null
  }

  const events = await prisma.event.findMany({
    include: dbUserId
      ? {
          registrations: {
            where: { userId: dbUserId },
            select: {
              id: true,
              status: true,
            },
          },
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  })

  return events.map((event) => {
    const registration = (event as any).registrations?.[0]
    return {
      id: event.id,
      title: event.title,
      date: event.date,
      location: event.location,
      type: event.type,
      attendees: event.attendees,
      image: event.image,
      description: event.description,
      matchScore: event.matchScore,
      registered: !!registration,
      registrationStatus: registration?.status || null,
    }
  })
}

// ============================================================================
// GET EVENT BY ID
// ============================================================================

export async function getEventById(id: string) {
  const { userId: clerkId } = await auth()

  let dbUserId: string | null = null
  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })
    dbUserId = user?.id || null
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: dbUserId
        ? {
            where: { userId: dbUserId },
            select: {
              id: true,
              status: true,
            },
          }
        : undefined,
    },
  })

  if (!event) return null

  const registration = (event as any).registrations?.[0]
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    location: event.location,
    type: event.type,
    attendees: event.attendees,
    image: event.image,
    description: event.description,
    matchScore: event.matchScore,
    registered: !!registration,
    registrationStatus: registration?.status || null,
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
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const validatedData = createEventSchema.parse(data)

  const event = await prisma.event.create({
    data: {
      title: validatedData.title,
      date: validatedData.date,
      location: validatedData.location,
      type: validatedData.type,
      attendees: validatedData.attendees || 0,
      image: validatedData.image || null,
      description: validatedData.description || null,
      matchScore: validatedData.matchScore || 0,
    },
  })

  revalidatePath("/events")
  return event
}

// ============================================================================
// REGISTER FOR EVENT
// ============================================================================

export async function registerForEvent(eventId: string) {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  // Check if event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  })

  if (!event) throw new Error("Event not found")

  // Create or update registration
  const registration = await prisma.eventRegistration.upsert({
    where: {
      userId_eventId: {
        userId: user.id,
        eventId,
      },
    },
    update: {
      status: "registered",
      updatedAt: new Date(),
    },
    create: {
      userId: user.id,
      eventId,
      status: "registered",
    },
  })

  // Increment attendee count
  await prisma.event.update({
    where: { id: eventId },
    data: { attendees: { increment: 1 } },
  })

  revalidatePath("/events")
  return registration
}

// ============================================================================
// UNREGISTER FROM EVENT
// ============================================================================

export async function unregisterFromEvent(eventId: string) {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  // Delete registration
  await prisma.eventRegistration.delete({
    where: {
      userId_eventId: {
        userId: user.id,
        eventId,
      },
    },
  })

  // Decrement attendee count (but don't go below 0)
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { attendees: true },
  })

  if (event && event.attendees > 0) {
    await prisma.event.update({
      where: { id: eventId },
      data: { attendees: { decrement: 1 } },
    })
  }

  revalidatePath("/events")
  return { success: true }
}

// ============================================================================
// GET MY REGISTRATIONS
// ============================================================================

export async function getMyRegistrations() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  const registrations = await prisma.eventRegistration.findMany({
    where: { userId: user.id },
    include: { event: true },
    orderBy: { createdAt: "desc" },
  })

  return registrations.map((reg) => ({
    id: reg.id,
    status: reg.status,
    registeredAt: reg.createdAt.toISOString(),
    event: {
      id: reg.event.id,
      title: reg.event.title,
      date: reg.event.date,
      location: reg.event.location,
      type: reg.event.type,
      attendees: reg.event.attendees,
      image: reg.event.image,
    },
  }))
}
