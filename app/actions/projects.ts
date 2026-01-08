"use server"

import { prisma } from "@/lib/prisma"
import { auth, currentUser } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

// ============================================================================
// GET PROJECTS
// ============================================================================

export async function getProjects() {
    const projects = await prisma.project.findMany({
        include: {
            owner: true,
            collaborators: {
                include: {
                    user: true,
                },
            },
        },
        orderBy: {
            updatedAt: "desc",
        },
    })

    return projects.map((project) => ({
        ...project,
        createdAt: getRelativeTime(project.createdAt),
        updatedAt: getRelativeTime(project.updatedAt),
        collaborators: project.collaborators.map((c) => ({
            id: c.user.id,
            name: c.user.name,
            avatar: c.user.avatar,
            role: c.role,
        })),
    }))
}

export async function getProjectById(id: string) {
    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            owner: true,
            collaborators: {
                include: {
                    user: true,
                },
            },
            updates: {
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    })

    if (!project) return null

    return {
        ...project,
        collaborators: project.collaborators.map((c) => ({
            id: c.user.id,
            name: c.user.name,
            avatar: c.user.avatar,
            role: c.role,
        })),
    }
}

// ============================================================================
// CREATE PROJECT
// ============================================================================

export async function createProject(data: {
    title: string
    description: string
    status: string
    visibility: string
    tags: string[]
    lookingFor: string[]
}) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    // Find the user by Clerk ID
    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    const project = await prisma.project.create({
        data: {
            title: data.title,
            description: data.description,
            status: data.status,
            visibility: data.visibility,
            tags: data.tags,
            lookingFor: data.lookingFor,
            ownerId: user.id,
            collaborators: {
                create: {
                    userId: user.id,
                    role: "Creator",
                },
            },
        },
        include: {
            collaborators: {
                include: {
                    user: true,
                },
            },
        },
    })

    revalidatePath("/projects")
    return {
        success: true,
        project: {
            ...project,
            createdAt: getRelativeTime(project.createdAt),
            updatedAt: getRelativeTime(project.updatedAt),
            collaborators: project.collaborators.map((c) => ({
                id: c.user.id,
                name: c.user.name,
                avatar: c.user.avatar,
                role: c.role,
            })),
        }
    }
}

// ============================================================================
// UPDATE PROJECT
// ============================================================================

export async function updateProject(
    id: string,
    data: Partial<{
        title: string
        description: string
        status: string
        visibility: string
        tags: string[]
        lookingFor: string[]
        progress: number
    }>
) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const project = await prisma.project.update({
        where: { id },
        data,
    })

    revalidatePath("/projects")
    revalidatePath(`/projects/${id}`)
    return project
}

// ============================================================================
// DELETE PROJECT
// ============================================================================

export async function deleteProject(id: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    await prisma.project.delete({
        where: { id },
    })

    revalidatePath("/projects")
}

// ============================================================================
// LIKE PROJECT
// ============================================================================

export async function likeProject(id: string) {
    const project = await prisma.project.update({
        where: { id },
        data: {
            likes: {
                increment: 1,
            },
        },
    })

    revalidatePath("/projects")
    return project
}

// ============================================================================
// PROJECT UPDATES
// ============================================================================

export async function getProjectUpdates() {
    const updates = await prisma.projectUpdate.findMany({
        include: {
            project: true,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 10,
    })

    return updates.map((update) => ({
        id: update.id,
        projectId: update.projectId,
        projectTitle: update.project.title,
        type: update.type,
        content: update.content,
        timestamp: getRelativeTime(update.createdAt),
    }))
}

// Helper function for relative time
function getRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    return `${Math.floor(diffDays / 7)} weeks ago`
}
