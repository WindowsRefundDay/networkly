"use server"

import { revalidatePath } from "next/cache"

import { createClient, requireAuth } from "@/lib/supabase/server"

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
