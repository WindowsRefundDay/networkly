"use server"

import { z } from "zod"

import { createClient, getCurrentUser } from "@/lib/supabase/server"

const globalSearchSchema = z.object({
  query: z.string().min(1).max(100),
  type: z.enum(["all", "users", "projects", "opportunities", "events"]).optional().default("all"),
  limit: z.number().min(1).max(50).optional().default(20),
})

export type SearchResultUser = {
  id: string
  name: string
  headline: string | null
  avatar: string | null
  university: string | null
  skills: string[]
  rank: number
  entityType: "user"
}

export type SearchResultProject = {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  visibility: string
  owner: {
    name: string
    avatar: string | null
  }
  rank: number
  entityType: "project"
}

export type SearchResultOpportunity = {
  id: string
  title: string
  company: string
  location: string
  opportunityType: string
  logo: string | null
  skills: string[]
  rank: number
  entityType: "opportunity"
}

export type SearchResultEvent = {
  id: string
  title: string
  date: string
  location: string
  eventType: string
  image: string | null
  rank: number
  entityType: "event"
}

export type SearchResults = {
  users: SearchResultUser[]
  projects: SearchResultProject[]
  opportunities: SearchResultOpportunity[]
  events: SearchResultEvent[]
  totalResults: number
}

export async function globalSearch(input: Partial<z.infer<typeof globalSearchSchema>>): Promise<SearchResults> {
  const validated = globalSearchSchema.parse(input)
  const { query, type, limit } = validated
  const supabase = await createClient()
  const authUser = await getCurrentUser()

  const currentUserId = authUser?.id ?? null

  const results: SearchResults = {
    users: [],
    projects: [],
    opportunities: [],
    events: [],
    totalResults: 0,
  }

  if (type === "all" || type === "users") {
    let usersQuery = supabase
      .from("users")
      .select("id, name, headline, avatar, university, skills")
      .eq("visibility", "public")
      .textSearch("search_vector", query, { type: "plain", config: "english" })
      .limit(type === "users" ? limit : Math.floor(limit / 4))

    if (currentUserId) {
      usersQuery = usersQuery.neq("id", currentUserId)
    }

    const { data: users, error } = await usersQuery
    if (error) throw new Error(error.message)

    results.users = (users || []).map((u) => ({
      ...u,
      rank: 0,
      entityType: "user" as const,
    }))
  }

  if (type === "all" || type === "projects") {
    const { data: projects, error } = await supabase
      .from("projects")
      .select(
        `
        id, title, description, category, tags, visibility,
        owner:users!projects_owner_id_fkey(name, avatar)
      `
      )
      .eq("visibility", "public")
      .textSearch("search_vector", query, { type: "plain", config: "english" })
      .limit(type === "projects" ? limit : Math.floor(limit / 4))

    if (error) throw new Error(error.message)

    results.projects = (projects || []).map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      tags: p.tags,
      visibility: p.visibility,
      owner: {
        name: p.owner?.name,
        avatar: p.owner?.avatar || null,
      },
      rank: 0,
      entityType: "project" as const,
    }))
  }

  if (type === "all" || type === "opportunities") {
    const { data: opportunities, error } = await supabase
      .from("opportunities")
      .select("id, title, company, location, type, logo, skills")
      .eq("is_active", true)
      .eq("is_expired", false)
      .textSearch("search_vector", query, { type: "plain", config: "english" })
      .limit(type === "opportunities" ? limit : Math.floor(limit / 4))

    if (error) throw new Error(error.message)

    results.opportunities = (opportunities || []).map((o) => ({
      id: o.id,
      title: o.title,
      company: o.company,
      location: o.location,
      opportunityType: o.type,
      logo: o.logo,
      skills: o.skills,
      rank: 0,
      entityType: "opportunity" as const,
    }))
  }

  if (type === "all" || type === "events") {
    const { data: events, error } = await supabase
      .from("events")
      .select("id, title, date, location, type, image")
      .textSearch("search_vector", query, { type: "plain", config: "english" })
      .limit(type === "events" ? limit : Math.floor(limit / 4))

    if (error) throw new Error(error.message)

    results.events = (events || []).map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      location: e.location,
      eventType: e.type,
      image: e.image,
      rank: 0,
      entityType: "event" as const,
    }))
  }

  results.totalResults =
    results.users.length +
    results.projects.length +
    results.opportunities.length +
    results.events.length

  return results
}

export async function fuzzySearch(query: string, entityType: "users" | "projects" | "opportunities") {
  const supabase = await createClient()

  if (entityType === "users") {
    const { data, error } = await supabase
      .from("users")
      .select("id, name")
      .eq("visibility", "public")
      .ilike("name", `%${query}%`)
      .limit(10)

    if (error) throw new Error(error.message)
    return (data || []).map((user) => ({ ...user, similarity: 0 }))
  }

  if (entityType === "projects") {
    const { data, error } = await supabase
      .from("projects")
      .select("id, title")
      .eq("visibility", "public")
      .ilike("title", `%${query}%`)
      .limit(10)

    if (error) throw new Error(error.message)
    return (data || []).map((project) => ({ ...project, similarity: 0 }))
  }

  if (entityType === "opportunities") {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, title")
      .eq("is_active", true)
      .ilike("title", `%${query}%`)
      .limit(10)

    if (error) throw new Error(error.message)
    return (data || []).map((opp) => ({ ...opp, similarity: 0 }))
  }

  return []
}
