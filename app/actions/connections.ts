"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

// ============================================================================
// GET CONNECTIONS
// ============================================================================

export async function getConnections() {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    const connections = await prisma.connection.findMany({
        where: {
            OR: [{ requesterId: user.id }, { receiverId: user.id }],
        },
        include: {
            requester: true,
            receiver: true,
        },
        orderBy: { createdAt: "desc" },
    })

    return connections.map((conn) => {
        const otherUser = conn.requesterId === user.id ? conn.receiver : conn.requester
        return {
            id: conn.id,
            name: otherUser.name,
            headline: otherUser.headline,
            avatar: otherUser.avatar,
            mutualConnections: conn.mutualConnections,
            matchReason: conn.matchReason,
            status: conn.status as "connected" | "pending" | "suggested",
            connectedDate: conn.connectedDate
                ? conn.connectedDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : null,
        }
    })
}

export async function getSuggestedConnections() {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    // Get users that are not already connected
    const existingConnections = await prisma.connection.findMany({
        where: {
            OR: [{ requesterId: user.id }, { receiverId: user.id }],
        },
        select: {
            requesterId: true,
            receiverId: true,
        },
    })

    const connectedUserIds = new Set(
        existingConnections.flatMap((c) => [c.requesterId, c.receiverId])
    )
    connectedUserIds.add(user.id) // Exclude self

    const suggestedUsers = await prisma.user.findMany({
        where: {
            id: { notIn: Array.from(connectedUserIds) },
        },
        take: 6,
    })

    return suggestedUsers.map((u) => ({
        id: u.id,
        name: u.name,
        headline: u.headline,
        avatar: u.avatar,
        mutualConnections: 0, // Would need to calculate in production
        matchReason: "Suggested based on your profile",
    }))
}

// ============================================================================
// SEND CONNECTION REQUEST
// ============================================================================

export async function sendConnectionRequest(receiverId: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    const connection = await prisma.connection.create({
        data: {
            requesterId: user.id,
            receiverId,
            status: "pending",
        },
    })

    revalidatePath("/network")
    return connection
}

// ============================================================================
// ACCEPT CONNECTION REQUEST
// ============================================================================

export async function acceptConnectionRequest(connectionId: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const connection = await prisma.connection.update({
        where: { id: connectionId },
        data: {
            status: "connected",
            connectedDate: new Date(),
        },
    })

    revalidatePath("/network")
    return connection
}

// ============================================================================
// REMOVE CONNECTION
// ============================================================================

export async function removeConnection(connectionId: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    await prisma.connection.delete({
        where: { id: connectionId },
    })

    revalidatePath("/network")
}

// ============================================================================
// GET NETWORK STATS
// ============================================================================

export async function getNetworkStats() {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true, profileViews: true },
    })

    if (!user) throw new Error("User not found")

    // Count total connections (accepted)
    const totalConnections = await prisma.connection.count({
        where: {
            OR: [{ requesterId: user.id }, { receiverId: user.id }],
            status: "accepted",
        },
    })

    // Count pending requests (where user is the receiver)
    const pendingRequests = await prisma.connection.count({
        where: {
            receiverId: user.id,
            status: "pending",
        },
    })

    // Count unread messages
    const unreadMessages = await prisma.message.count({
        where: {
            receiverId: user.id,
            unread: true,
        },
    })

    // Get profile views from user record
    const profileViews = user.profileViews

    return {
        totalConnections,
        pendingRequests,
        unreadMessages,
        profileViews,
    }
}
