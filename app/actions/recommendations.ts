"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

export async function getRecommendations(targetUserId?: string) {
    const { userId: clerkId } = await auth()
    if (!clerkId) throw new Error("Unauthorized")

    let dbUserId = targetUserId

    if (!dbUserId) {
        const user = await prisma.user.findUnique({
            where: { clerkId },
            select: { id: true }
        })
        if (!user) return []
        dbUserId = user.id
    }

    const recommendations = await prisma.recommendation.findMany({
        where: { receiverId: dbUserId },
        orderBy: { createdAt: "desc" },
    })

    return recommendations.map(rec => ({
        id: rec.id,
        author: rec.authorName,
        role: rec.authorRole,
        avatar: rec.authorAvatar,
        content: rec.content,
        date: rec.date,
    }))
}

export async function addRecommendation(data: {
    receiverId: string
    content: string
    authorName: string
    authorRole: string
    authorAvatar?: string
    date: string
}) {
    const { userId: clerkId } = await auth()
    if (!clerkId) throw new Error("Unauthorized")

    const author = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true }
    })

    if (!author) throw new Error("Author not found")

    const recommendation = await prisma.recommendation.create({
        data: {
            ...data,
            authorId: author.id,
        }
    })

    revalidatePath("/profile")
    return recommendation
}
