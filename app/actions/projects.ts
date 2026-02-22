"use server"

import { revalidatePath } from "next/cache"

import { createClient, getCurrentUser, requireAuth } from "@/lib/supabase/server"
import type { ProjectLink } from "@/lib/projects"
import type { ProjectWithOwner, ProjectUpdateRow, User } from "@/lib/types"

// ============================================================================
// HELPER: Transform project data
// ============================================================================

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
    tags: (project.tags as string[]) || [],
    progress: (project.progress as number) || 0,
    links: (project.links as ProjectLink[]) || [],
    lookingFor: (project.looking_for as string[]) || [],
    ownerId: project.owner_id as string,
    ownerName: project.owner?.name as string | undefined,
    ownerAvatar: project.owner?.avatar as string | null | undefined,
    createdAt: getRelativeTime(new Date(project.created_at)),
    updatedAt: getRelativeTime(new Date(project.updated_at)),
    collaborators:
      project.project_collaborators?.map(
        (c: any) => ({
          id: c.users?.id,
          name: c.users?.name,
          avatar: c.users?.avatar,
          role: c.role,
        })
      ) || [],
  }
}

// ============================================================================
// GET MY PROJECTS (current user's projects only)
// ============================================================================

export async function getMyProjects(category?: string) {
  const supabase = await createClient()
  const authUser = await getCurrentUser()
  if (!authUser) return []

  let query = supabase
    .from("projects")
    .select(
      `
            *,
            owner:users!projects_owner_id_fkey(*),
            project_collaborators(*, users(*))
        `
    )
    .eq("owner_id", authUser.id)
    .order("updated_at", { ascending: false })

  if (category && category !== "all") {
    query = query.eq("category", category)
  }

  const { data, error } = await query
  const projects = data as any[] | null

  if (error) {
    console.error("[getMyProjects]", error)
    return []
  }

  return (projects || []).map(transformProject)
}

// ============================================================================
// GET DISCOVER PROJECTS (public projects from other users)
// ============================================================================

export async function getDiscoverProjects(category?: string) {
  const supabase = await createClient()
  const authUser = await getCurrentUser()

  let query = supabase
    .from("projects")
    .select(
      `
            *,
            owner:users!projects_owner_id_fkey(*),
            project_collaborators(*, users(*))
        `
    )
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(50)

  if (authUser) {
    query = query.neq("owner_id", authUser.id)
  }

  if (category && category !== "all") {
    query = query.eq("category", category)
  }

  const { data, error } = await query
  const projects = data as any[] | null

  if (error) {
    console.error("[getDiscoverProjects]", error)
    return []
  }

  return (projects || []).map(transformProject)
}

// ============================================================================
// GET PROJECTS LOOKING FOR HELP (public projects seeking collaborators)
// ============================================================================

export async function getProjectsLookingForHelp(category?: string) {
  const supabase = await createClient()
  const authUser = await getCurrentUser()

  let query = supabase
    .from("projects")
    .select(
      `
            *,
            owner:users!projects_owner_id_fkey(*),
            project_collaborators(*, users(*))
        `
    )
    .eq("visibility", "public")
    .not("looking_for", "eq", "{}")
    .order("updated_at", { ascending: false })
    .limit(50)

  if (authUser) {
    query = query.neq("owner_id", authUser.id)
  }

  if (category && category !== "all") {
    query = query.eq("category", category)
  }

  const { data, error } = await query
  const projects = data as any[] | null

  if (error) {
    console.error("[getProjectsLookingForHelp]", error)
    return []
  }

  return (projects || []).map(transformProject)
}

// ============================================================================
// GET PROJECT BY ID
// ============================================================================

export async function getProjectById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
            *,
            owner:users!projects_owner_id_fkey(*),
            project_collaborators(*, users(*)),
            project_updates(*)
        `
    )
    .eq("id", id)
    .single()

  const project = data as any | null

  if (error || !project) {
    console.error("[getProjectById]", error)
    return null
  }

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
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .insert({
      title: data.title,
      description: data.description,
      category: data.category,
      status: data.status,
      visibility: data.visibility,
      tags: data.tags,
      looking_for: data.lookingFor,
      links: (data.links || []) as unknown as Record<string, unknown>[],
      owner_id: authUser.id,
    } as any)
    .select(
      `
            *,
            owner:users!projects_owner_id_fkey(*),
            project_collaborators(*, users(*))
        `
    )
    .single()

  const project = projectData as any | null

  if (projectError || !project) {
    console.error("[createProject]", projectError)
    throw new Error("Failed to create project")
  }

  await supabase.from("project_collaborators").insert({
    project_id: project.id,
    user_id: authUser.id,
    role: "Creator",
  } as any)

  await supabase.from("project_updates").insert({
    project_id: project.id,
    type: "milestone",
    content: `Project "${project.title}" was created`,
  } as any)

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
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: existingProjectData, error: fetchError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single()

  const existingProject = existingProjectData as any | null

  if (fetchError || !existingProject) throw new Error("Project not found")
  if (existingProject.owner_id !== authUser.id) {
    throw new Error("Not authorized to update this project")
  }

  const updateData: Record<string, any> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.category !== undefined) updateData.category = data.category
  if (data.status !== undefined) updateData.status = data.status
  if (data.visibility !== undefined) updateData.visibility = data.visibility
  if (data.tags !== undefined) updateData.tags = data.tags
  if (data.lookingFor !== undefined) updateData.looking_for = data.lookingFor
  if (data.progress !== undefined) updateData.progress = data.progress
  if (data.image !== undefined) updateData.image = data.image
  if (data.links !== undefined) {
    updateData.links = data.links as unknown as Record<string, unknown>[]
  }

  const { data: projectData, error: updateError } = await (supabase.from("projects") as any)
    .update(updateData)
    .eq("id", id)
    .select(
      `
            *,
            owner:users!projects_owner_id_fkey(*),
            project_collaborators(*, users(*))
        `
    )
    .single()

  const project = projectData as any | null

  if (updateError || !project) {
    console.error("[updateProject]", updateError)
    throw new Error("Failed to update project")
  }

  if (data.status && data.status !== existingProject.status) {
    await (supabase.from("project_updates") as any).insert({
      project_id: project.id,
      type: "update",
      content: `Status changed to "${data.status}"`,
    })
  }

  if (data.progress !== undefined && data.progress !== existingProject.progress) {
    const milestone = data.progress === 100 ? "completed" : data.progress >= 50 ? "halfway" : null
    if (milestone) {
      await (supabase.from("project_updates") as any).insert({
        project_id: project.id,
        type: "milestone",
        content: milestone === "completed" ? "Project completed!" : "Reached 50% completion",
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
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data, error: fetchError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single()

  const project = data as any | null

  if (fetchError || !project) throw new Error("Project not found")
  if (project.owner_id !== authUser.id) throw new Error("Not authorized to delete this project")

  const { error: deleteError } = await (supabase.from("projects") as any).delete().eq("id", id)

  if (deleteError) {
    console.error("[deleteProject]", deleteError)
    throw new Error("Failed to delete project")
  }

  revalidatePath("/projects")
  return { success: true }
}

// ============================================================================
// LIKE PROJECT
// ============================================================================

export async function likeProject(id: string) {
  const supabase = await createClient()
  await requireAuth()

  const { data, error } = await (supabase as any).rpc("increment_project_likes", { project_id: id })

  if (error) {
    const { data: projectData, error: fetchError } = await supabase
      .from("projects")
      .select("likes")
      .eq("id", id)
      .single()

    const project = projectData as any | null

    if (fetchError || !project) throw new Error("Project not found")

    const { data: updatedProjectData, error: updateError } = await (supabase.from("projects") as any)
      .update({ likes: project.likes + 1 })
      .eq("id", id)
      .select("likes")
      .single()

    const updatedProject = updatedProjectData as any | null

    if (updateError || !updatedProject) {
      console.error("[likeProject]", updateError)
      throw new Error("Failed to like project")
    }

    revalidatePath("/projects")
    return { success: true, likes: updatedProject.likes }
  }

  revalidatePath("/projects")
  return { success: true, likes: data }
}

// ============================================================================
// PROJECT UPDATES (for current user's projects only)
// ============================================================================

export async function getMyProjectUpdates() {
  const supabase = await createClient()
  const authUser = await getCurrentUser()
  if (!authUser) return []

  const { data: userProjectsData, error: projectsError } = await supabase
    .from("projects")
    .select("id, title")
    .eq("owner_id", authUser.id)

  const userProjects = userProjectsData as any[] | null

  if (projectsError || !userProjects || userProjects.length === 0) {
    return []
  }

  const projectIds = userProjects.map((p: any) => p.id)
  const projectTitles = Object.fromEntries(
    userProjects.map((p: any) => [p.id, p.title])
  )

  const { data: updatesData, error: updatesError } = await supabase
    .from("project_updates")
    .select("*")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false })
    .limit(10)

  const updates = updatesData as ProjectUpdateRow[] | null

  if (updatesError) {
    console.error("[getMyProjectUpdates]", updatesError)
    return []
  }

  return (updates || []).map(
    (update: ProjectUpdateRow) => ({
      id: update.id,
      projectId: update.project_id,
      projectTitle: projectTitles[update.project_id] || "Unknown Project",
      type: update.type,
      content: update.content || "",
      timestamp: getRelativeTime(new Date(update.created_at)),
    })
  )
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
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: projectData, error: fetchError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single()

  const project = projectData as any | null

  if (fetchError || !project) throw new Error("Project not found")
  if (project.owner_id !== authUser.id) throw new Error("Not authorized to update this project")

  const { data: updateData, error: insertError } = await supabase
    .from("project_updates")
    .insert({
      project_id: projectId,
      type: data.type,
      content: data.content,
    } as any)
    .select("*")
    .single()

  const update = updateData as ProjectUpdateRow | null

  if (insertError || !update) {
    console.error("[addProjectUpdate]", insertError)
    throw new Error("Failed to add project update")
  }

  revalidatePath("/projects")
  return {
    success: true,
    update: {
      id: update.id,
      projectId: update.project_id,
      projectTitle: project.title,
      type: update.type,
      content: update.content || "",
      timestamp: getRelativeTime(new Date(update.created_at)),
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
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? "" : "s"} ago`
  }
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? "" : "s"} ago`
}
