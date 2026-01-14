"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import type { ProjectLink } from "@/lib/projects"

// ============================================================================
// HELPER: Transform project data
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProject(project: any) {
    return {
        id: project.id as string,
        title: project.title as string,
        description: project.description as string,
        image: project.image as string | null,
        category: project.category as string,
        status: project.status as string,
        visibility: project.visibility as string,
        likes: project.likes as number,
        views: project.views as number,
        comments: project.comments as number,
        tags: project.tags as string[],
        progress: project.progress as number,
        links: (project.links as ProjectLink[]) || [],
        lookingFor: project.lookingFor as string[],
        ownerId: project.ownerId as string,
        ownerName: project.owner?.name as string | undefined,
        ownerAvatar: project.owner?.avatar as string | null | undefined,
        createdAt: getRelativeTime(project.createdAt),
        updatedAt: getRelativeTime(project.updatedAt),
        collaborators:
            project.collaborators?.map((c: { user: { id: string; name: string; avatar: string | null }; role: string }) => ({
                id: c.user.id,
                name: c.user.name,
                avatar: c.user.avatar,
                role: c.role,
            })) || [],
    }
}

// ============================================================================
// GET MY PROJECTS (current user's projects only)
// ============================================================================

export async function getMyProjects(category?: string) {
    const { userId } = await auth()
    if (!userId) return []

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) return []

    const projects = await prisma.project.findMany({
        where: {
            ownerId: user.id,
            ...(category && category !== "all" ? { category } : {}),
        },
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

    return projects.map(transformProject)
}

// ============================================================================
// GET DISCOVER PROJECTS (public projects from other users)
// ============================================================================

export async function getDiscoverProjects(category?: string) {
    const { userId } = await auth()

    let currentUserId: string | null = null
    if (userId) {
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        })
        currentUserId = user?.id ?? null
    }

    const projects = await prisma.project.findMany({
        where: {
            visibility: "public",
            ...(currentUserId ? { ownerId: { not: currentUserId } } : {}),
            ...(category && category !== "all" ? { category } : {}),
        },
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
        take: 50,
    })

    return projects.map(transformProject)
}

// ============================================================================
// GET PROJECTS LOOKING FOR HELP (public projects seeking collaborators)
// ============================================================================

export async function getProjectsLookingForHelp(category?: string) {
    const { userId } = await auth()

    let currentUserId: string | null = null
    if (userId) {
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        })
        currentUserId = user?.id ?? null
    }

    const projects = await prisma.project.findMany({
        where: {
            visibility: "public",
            lookingFor: { isEmpty: false },
            ...(currentUserId ? { ownerId: { not: currentUserId } } : {}),
            ...(category && category !== "all" ? { category } : {}),
        },
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
        take: 50,
    })

    return projects.map(transformProject)
}

// ============================================================================
// GET PROJECT BY ID
// ============================================================================

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

    return transformProject(project)
}

// ============================================================================
// CREATE PROJECT
// ============================================================================

export async function createProject(data: {
    title: string
    description: string
    category: string
    status: string
    visibility: string
    tags: string[]
    lookingFor: string[]
    links?: ProjectLink[]
}) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    const project = await prisma.project.create({
        data: {
            title: data.title,
            description: data.description,
            category: data.category,
            status: data.status,
            visibility: data.visibility,
            tags: data.tags,
            lookingFor: data.lookingFor,
            links: (data.links || []) as object[],
            ownerId: user.id,
            collaborators: {
                create: {
                    userId: user.id,
                    role: "Creator",
                },
            },
        },
        include: {
            owner: true,
            collaborators: {
                include: {
                    user: true,
                },
            },
        },
    })

    // Create initial project update
    await prisma.projectUpdate.create({
        data: {
            projectId: project.id,
            type: "milestone",
            content: `Project "${project.title}" was created`,
        },
    })

    revalidatePath("/projects")
    return {
        success: true,
        project: transformProject(project),
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
        category: string
        status: string
        visibility: string
        tags: string[]
        lookingFor: string[]
        progress: number
        links: ProjectLink[]
        image: string
    }>
) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    // Verify ownership
    const existingProject = await prisma.project.findUnique({
        where: { id },
    })

    if (!existingProject) throw new Error("Project not found")
    if (existingProject.ownerId !== user.id) throw new Error("Not authorized to update this project")

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.category !== undefined) updateData.category = data.category
    if (data.status !== undefined) updateData.status = data.status
    if (data.visibility !== undefined) updateData.visibility = data.visibility
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.lookingFor !== undefined) updateData.lookingFor = data.lookingFor
    if (data.progress !== undefined) updateData.progress = data.progress
    if (data.image !== undefined) updateData.image = data.image
    if (data.links !== undefined) updateData.links = data.links as object[]

    const project = await prisma.project.update({
        where: { id },
        data: updateData,
        include: {
            owner: true,
            collaborators: {
                include: {
                    user: true,
                },
            },
        },
    })

    // Create update entry if status changed
    if (data.status && data.status !== existingProject.status) {
        await prisma.projectUpdate.create({
            data: {
                projectId: project.id,
                type: "update",
                content: `Status changed to "${data.status}"`,
            },
        })
    }

    // Create update entry if progress changed significantly
    if (data.progress !== undefined && data.progress !== existingProject.progress) {
        const milestone = data.progress === 100 ? "completed" : data.progress >= 50 ? "halfway" : null
        if (milestone) {
            await prisma.projectUpdate.create({
                data: {
                    projectId: project.id,
                    type: "milestone",
                    content: milestone === "completed" ? "Project completed!" : "Reached 50% completion",
                },
            })
        }
    }

    revalidatePath("/projects")
    revalidatePath(`/projects/${id}`)
    return {
        success: true,
        project: transformProject(project),
    }
}

// ============================================================================
// DELETE PROJECT
// ============================================================================

export async function deleteProject(id: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    // Verify ownership
    const project = await prisma.project.findUnique({
        where: { id },
    })

    if (!project) throw new Error("Project not found")
    if (project.ownerId !== user.id) throw new Error("Not authorized to delete this project")

    await prisma.project.delete({
        where: { id },
    })

    revalidatePath("/projects")
    return { success: true }
}

// ============================================================================
// LIKE PROJECT
// ============================================================================

export async function likeProject(id: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const project = await prisma.project.update({
        where: { id },
        data: {
            likes: {
                increment: 1,
            },
        },
    })

    revalidatePath("/projects")
    return { success: true, likes: project.likes }
}

// ============================================================================
// PROJECT UPDATES (for current user's projects only)
// ============================================================================

export async function getMyProjectUpdates() {
    const { userId } = await auth()
    if (!userId) return []

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) return []

    const updates = await prisma.projectUpdate.findMany({
        where: {
            project: {
                ownerId: user.id,
            },
        },
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

// ============================================================================
// ADD PROJECT UPDATE
// ============================================================================

export async function addProjectUpdate(
    projectId: string,
    data: {
        type: "milestone" | "update" | "feature"
        content: string
    }
) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })

    if (!user) throw new Error("User not found")

    // Verify ownership
    const project = await prisma.project.findUnique({
        where: { id: projectId },
    })

    if (!project) throw new Error("Project not found")
    if (project.ownerId !== user.id) throw new Error("Not authorized to update this project")

    const update = await prisma.projectUpdate.create({
        data: {
            projectId,
            type: data.type,
            content: data.content,
        },
        include: {
            project: true,
        },
    })

    revalidatePath("/projects")
    return {
        success: true,
        update: {
            id: update.id,
            projectId: update.projectId,
            projectTitle: update.project.title,
            type: update.type,
            content: update.content,
            timestamp: getRelativeTime(update.createdAt),
        },
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? "" : "s"} ago`
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? "" : "s"} ago`
}
