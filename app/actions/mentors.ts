"use server"

import { createClient, getCurrentUser } from "@/lib/supabase/server"

export interface Mentor {
  id: string
  name: string
  title: string
  institution: string
  department: string
  researchAreas: string[]
  email: string | null
  labUrl: string | null
  profileUrl: string | null
  bio: string | null
  matchScore: number
  relevanceReason: string | null
}

export interface SearchMentorsResult {
  mentors: Mentor[]
  source: "database" | "discovery"
  count: number
}

export async function searchMentors(
  query: string,
  options?: {
    institution?: string
    limit?: number
  }
): Promise<SearchMentorsResult> {
  const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://localhost:8080"
  const API_TOKEN = process.env.DISCOVERY_API_TOKEN

  if (!API_TOKEN) {
    console.error("[searchMentors] DISCOVERY_API_TOKEN not configured")
    return { mentors: [], source: "database", count: 0 }
  }

  try {
    const url = new URL(`${SCRAPER_API_URL}/api/v1/mentors/search`)
    url.searchParams.set("query", query)
    if (options?.limit) url.searchParams.set("limit", options.limit.toString())

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("[searchMentors] Scraper error:", await response.text())
      return { mentors: [], source: "database", count: 0 }
    }

    const data = await response.json()
    
    const mentors: Mentor[] = (data.results || []).map((m: Record<string, unknown>) => ({
      id: (m.id as string) || `mentor_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: (m.name as string) || "Unknown",
      title: (m.title as string) || "Professor",
      institution: (m.institution as string) || "Unknown Institution",
      department: (m.department as string) || "",
      researchAreas: (m.research_areas as string[]) || (m.researchAreas as string[]) || [],
      email: (m.email as string) || null,
      labUrl: (m.lab_url as string) || (m.labUrl as string) || null,
      profileUrl: (m.profile_url as string) || (m.profileUrl as string) || null,
      bio: (m.bio as string) || null,
      matchScore: (m.similarity as number) || (m.matchScore as number) || 0,
      relevanceReason: (m.relevance_reason as string) || null,
    }))

    return {
      mentors,
      source: "database",
      count: mentors.length,
    }
  } catch (error) {
    console.error("[searchMentors] Error:", error)
    return { mentors: [], source: "database", count: 0 }
  }
}

export async function getSuggestedMentors(): Promise<Mentor[]> {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) return []

  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("interests, career_goals")
      .eq("user_id", user.id)
      .single()

    if (!profile) return []

    const profileData = profile as unknown as { interests?: string[]; career_goals?: string }
    const interests = profileData.interests || []
    const careerGoals = profileData.career_goals

    const searchQuery = [...interests, careerGoals].filter(Boolean).join(" ")

    if (!searchQuery) return []

    const result = await searchMentors(searchQuery, { limit: 5 })
    return result.mentors
  } catch (error) {
    console.error("[getSuggestedMentors] Error:", error)
    return []
  }
}

export async function saveMentor(mentorId: string, mentorData: Partial<Mentor>) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) throw new Error("Unauthorized")

  const insertData = {
    user_id: user.id,
    type: "saved_mentor",
    metadata: {
      mentor_id: mentorId,
      mentor_name: mentorData.name,
      institution: mentorData.institution,
      research_areas: mentorData.researchAreas,
    },
  }

  const { error } = await (supabase.from("user_activities").insert as Function)(insertData)

  if (error) {
    console.error("[saveMentor] Error:", error)
    throw new Error("Failed to save mentor")
  }

  return { success: true }
}

export async function getSavedMentors(): Promise<Mentor[]> {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) return []

  const { data: activities } = await supabase
    .from("user_activities")
    .select("metadata")
    .eq("user_id", user.id)
    .eq("type", "saved_mentor")
    .order("date", { ascending: false })

  if (!activities) return []

  return activities.map((a: unknown) => {
    const activity = a as { metadata?: Record<string, unknown> }
    const metadata = activity.metadata || {}
    return {
      id: (metadata.mentor_id as string) || "",
      name: (metadata.mentor_name as string) || "Unknown",
      title: "Professor",
      institution: (metadata.institution as string) || "",
      department: "",
      researchAreas: (metadata.research_areas as string[]) || [],
      email: null,
      labUrl: null,
      profileUrl: null,
      bio: null,
      matchScore: 0,
      relevanceReason: null,
    }
  })
}
