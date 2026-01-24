"use server"

import { revalidatePath } from "next/cache"

import { createClient, requireAuth } from "@/lib/supabase/server"
import { triggerDiscovery } from "@/app/actions/discovery"

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "1 day ago"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

export async function getOpportunities(filters?: {
  type?: string
  category?: string
  remote?: boolean
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let query = supabase.from("opportunities").select("*").eq("is_active", true)

  if (filters?.type) query = query.eq("type", filters.type)
  if (filters?.category) query = query.eq("category", filters.category)
  if (filters?.remote !== undefined) query = query.eq("remote", filters.remote)

  const { data: opportunities, error } = await query.order("deadline", { ascending: true })

  if (error) throw new Error(error.message)

  let userOpportunities: Record<string, { match_score: number; match_reasons: unknown; status: string }> =
    {}

  if (authUser) {
    const { data: userOpps } = await supabase
      .from("user_opportunities")
      .select("opportunity_id, match_score, match_reasons, status")
      .eq("user_id", authUser.id)

    userOpportunities = (userOpps || []).reduce((acc, uo) => {
      acc[uo.opportunity_id] = {
        match_score: uo.match_score,
        match_reasons: uo.match_reasons,
        status: uo.status,
      }
      return acc
    }, {} as Record<string, { match_score: number; match_reasons: unknown; status: string }>)
  }

  return (opportunities || []).map((opp) => {
    const userOpp = userOpportunities[opp.id]
    return {
      id: opp.id,
      url: opp.url,
      title: opp.title,
      company: opp.company,
      location: opp.location,
      type: opp.type,
      category: opp.category,
      matchScore: userOpp?.match_score || 0,
      matchReasons: userOpp?.match_reasons || [],
      deadline: opp.deadline ? formatDate(new Date(opp.deadline)) : null,
      postedDate: getRelativeTime(new Date(opp.posted_date)),
      logo: opp.logo,
      skills: opp.skills,
      description: opp.description,
      salary: opp.salary,
      duration: opp.duration,
      remote: opp.remote,
      applicants: opp.applicants,
      requirements: opp.requirements,
      extractionConfidence: opp.extraction_confidence,
      status: userOpp?.status || null,
      saved: userOpp?.status === "saved",
    }
  })
}

export interface SearchOpportunitiesResult {
  opportunities: Awaited<ReturnType<typeof getOpportunities>>
  discoveryTriggered: boolean
  newOpportunitiesFound: number
}

export async function searchOpportunities(
  query: string,
  filters?: {
    type?: string
    category?: string
    remote?: boolean
  }
): Promise<SearchOpportunitiesResult> {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const sanitizedQuery = query.trim()

  // If no query, return all opportunities (same as getOpportunities)
  if (!sanitizedQuery) {
    const opportunities = await getOpportunities(filters)
    return { opportunities, discoveryTriggered: false, newOpportunitiesFound: 0 }
  }

  // Build the search query with ilike on title and company
  const searchPattern = `%${sanitizedQuery}%`

  let dbQuery = supabase
    .from("opportunities")
    .select("*")
    .eq("is_active", true)
    .or(`title.ilike.${searchPattern},company.ilike.${searchPattern},category.ilike.${searchPattern}`)

  // Apply filters
  if (filters?.type) dbQuery = dbQuery.eq("type", filters.type)
  if (filters?.category) dbQuery = dbQuery.eq("category", filters.category)
  if (filters?.remote !== undefined) dbQuery = dbQuery.eq("remote", filters.remote)

  const { data: opportunities, error } = await dbQuery.order("deadline", { ascending: true })

  if (error) throw new Error(error.message)

  // Get user opportunities for match scores
  let userOpportunities: Record<string, { match_score: number; match_reasons: unknown; status: string }> =
    {}

  if (authUser) {
    const { data: userOpps } = await supabase
      .from("user_opportunities")
      .select("opportunity_id, match_score, match_reasons, status")
      .eq("user_id", authUser.id)

    userOpportunities = (userOpps || []).reduce((acc, uo) => {
      acc[uo.opportunity_id] = {
        match_score: uo.match_score,
        match_reasons: uo.match_reasons,
        status: uo.status,
      }
      return acc
    }, {} as Record<string, { match_score: number; match_reasons: unknown; status: string }>)
  }

  const mapOpportunity = (opp: (typeof opportunities)[number]) => {
    const userOpp = userOpportunities[opp.id]
    return {
      id: opp.id,
      url: opp.url,
      title: opp.title,
      company: opp.company,
      location: opp.location,
      type: opp.type,
      category: opp.category,
      matchScore: userOpp?.match_score || 0,
      matchReasons: userOpp?.match_reasons || [],
      deadline: opp.deadline ? formatDate(new Date(opp.deadline)) : null,
      postedDate: getRelativeTime(new Date(opp.posted_date)),
      logo: opp.logo,
      skills: opp.skills,
      description: opp.description,
      salary: opp.salary,
      duration: opp.duration,
      remote: opp.remote,
      applicants: opp.applicants,
      requirements: opp.requirements,
      extractionConfidence: opp.extraction_confidence,
      status: userOpp?.status || null,
      saved: userOpp?.status === "saved",
    }
  }

  // If we have results, return them
  if (opportunities && opportunities.length > 0) {
    return {
      opportunities: opportunities.map(mapOpportunity),
      discoveryTriggered: false,
      newOpportunitiesFound: 0,
    }
  }

  // No results and query is long enough: trigger discovery
  if (sanitizedQuery.length >= 3) {
    const discoveryResult = await triggerDiscovery(sanitizedQuery)

    if (discoveryResult.success && discoveryResult.newOpportunities && discoveryResult.newOpportunities > 0) {
      // Re-run search to pick up newly discovered opportunities
      const { data: newOpportunities, error: newError } = await dbQuery

      if (newError) throw new Error(newError.message)

      return {
        opportunities: (newOpportunities || []).map(mapOpportunity),
        discoveryTriggered: true,
        newOpportunitiesFound: discoveryResult.newOpportunities,
      }
    }

    // Discovery ran but found nothing new
    return {
      opportunities: [],
      discoveryTriggered: true,
      newOpportunitiesFound: 0,
    }
  }

  // Query too short for discovery, return empty
  return {
    opportunities: [],
    discoveryTriggered: false,
    newOpportunitiesFound: 0,
  }
}

export async function getCuratedOpportunities() {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { data: userOpportunities, error } = await supabase
    .from("user_opportunities")
    .select(
      `
            *,
            opportunity:opportunities (*)
        `
    )
    .eq("user_id", authUser.id)
    .in("status", ["saved", "curated", "applied"])
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return (userOpportunities || []).map((uo) => ({
    id: uo.opportunity.id,
    title: uo.opportunity.title,
    company: uo.opportunity.company,
    location: uo.opportunity.location,
    type: uo.opportunity.type,
    category: uo.opportunity.category,
    matchScore: uo.match_score,
    matchReasons: uo.match_reasons,
    deadline: uo.opportunity.deadline ? formatDate(new Date(uo.opportunity.deadline)) : null,
    logo: uo.opportunity.logo,
    skills: uo.opportunity.skills,
    description: uo.opportunity.description,
    status: uo.status,
    savedAt: uo.created_at,
  }))
}

export async function saveOpportunity(opportunityId: string) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { error } = await supabase.from("user_opportunities").upsert(
    {
      user_id: authUser.id,
      opportunity_id: opportunityId,
      status: "saved",
      match_score: 0,
      match_reasons: [],
    },
    { onConflict: "user_id,opportunity_id" }
  )

  if (error) throw new Error(error.message)

  revalidatePath("/opportunities")
  return { success: true }
}

export async function dismissOpportunity(opportunityId: string) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { error } = await supabase.from("user_opportunities").upsert(
    {
      user_id: authUser.id,
      opportunity_id: opportunityId,
      status: "dismissed",
      match_score: 0,
      match_reasons: [],
    },
    { onConflict: "user_id,opportunity_id" }
  )

  if (error) throw new Error(error.message)

  revalidatePath("/opportunities")
  return { success: true }
}

export async function unsaveOpportunity(opportunityId: string) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { error } = await supabase
    .from("user_opportunities")
    .delete()
    .eq("user_id", authUser.id)
    .eq("opportunity_id", opportunityId)

  if (error) throw new Error(error.message)

  revalidatePath("/opportunities")
  return { success: true }
}

export async function calculateMatchScore(opportunityId: string) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { data: user } = await supabase
    .from("users")
    .select("skills, interests, location")
    .eq("id", authUser.id)
    .single()

  if (!user) throw new Error("User not found")

  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", opportunityId)
    .single()

  if (!opportunity) throw new Error("Opportunity not found")

  const userSkills = new Set(user.skills.map((s: string) => s.toLowerCase()))
  const oppSkills = new Set(opportunity.skills.map((s: string) => s.toLowerCase()))

  let overlap = 0
  for (const skill of oppSkills) {
    if (userSkills.has(skill)) overlap++
  }

  const skillScore = oppSkills.size > 0 ? Math.round((overlap / oppSkills.size) * 50) : 25
  const interestBonus = user.interests.some((i: string) =>
    opportunity.category.toLowerCase().includes(i.toLowerCase())
  )
    ? 25
    : 0
  const locationBonus =
    opportunity.remote ||
    (user.location && opportunity.location?.toLowerCase().includes(user.location.toLowerCase()))
      ? 15
      : 0

  const score = Math.min(100, skillScore + interestBonus + locationBonus + 10)

  const reasons: string[] = []
  if (overlap > 0) reasons.push(`${overlap} matching skills`)
  if (interestBonus > 0) reasons.push("Matches your interests")
  if (locationBonus > 0) reasons.push(opportunity.remote ? "Remote opportunity" : "Location match")

  const { error } = await supabase.from("user_opportunities").upsert(
    {
      user_id: authUser.id,
      opportunity_id: opportunityId,
      match_score: score,
      match_reasons: reasons,
      status: "curated",
    },
    { onConflict: "user_id,opportunity_id" }
  )

  if (error) throw new Error(error.message)

  revalidatePath("/opportunities")
  return { score, reasons }
}
