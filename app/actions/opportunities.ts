"use server"

import { revalidatePath } from "next/cache"

import { createClient, requireAuth, getCurrentUser } from "@/lib/supabase/server"
import { triggerDiscovery } from "@/app/actions/discovery"
import { getStatuses, type OpportunityStatus } from "@/app/actions/opportunity-status"
import { getUserProfile } from "@/app/actions/user"
import type { Opportunity, UserOpportunity, User } from "@/lib/types"

// Discovery cooldown tracking (in-memory, resets on server restart)
const discoveryLocks = new Map<string, number>()
const DISCOVERY_COOLDOWN_MS = 15 * 60 * 1000 // 15 minutes - aggressive cooldown for cost/speed optimization

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
}

function canTriggerDiscovery(query: string): boolean {
  const normalized = normalizeQuery(query)
  const lastTrigger = discoveryLocks.get(normalized)

  if (!lastTrigger) return true

  const timeSince = Date.now() - lastTrigger
  return timeSince > DISCOVERY_COOLDOWN_MS
}

function markDiscoveryTriggered(query: string): void {
  const normalized = normalizeQuery(query)
  discoveryLocks.set(normalized, Date.now())

  // Clean up old entries (older than 15 minutes)
  const cutoff = Date.now() - 15 * 60 * 1000
  for (const [key, timestamp] of discoveryLocks.entries()) {
    if (timestamp < cutoff) {
      discoveryLocks.delete(key)
    }
  }
}

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
  page?: number
  pageSize?: number
}) {
  const authUser = await getCurrentUser()
  const supabase = await createClient()

  const page = filters?.page || 1
  const pageSize = filters?.pageSize || 50
  const offset = (page - 1) * pageSize

  let query = supabase.from("opportunities").select("*", { count: "exact" }).eq("is_active", true)
    .neq("title", "Unknown")   // Filter out placeholder entries
    .neq("title", "")          // Filter out empty titles

  if (filters?.type) query = query.eq("type", filters.type)
  if (filters?.category) query = query.eq("category", filters.category)
  if (filters?.remote !== undefined) query = query.eq("remote", filters.remote)

  const { data, error, count } = await query
    .order("deadline", { ascending: true })
    .range(offset, offset + pageSize - 1)

  const opportunities = data as Opportunity[] | null

  if (error) throw new Error(error.message)

  let userOpportunities: Record<string, { match_score: number; match_reasons: unknown; status: string }> =
    {}

  if (authUser) {
    const { data: userOppsData } = await supabase
      .from("user_opportunities")
      .select("opportunity_id, match_score, match_reasons, status")
      .eq("user_id", authUser.id)

    const userOpps = userOppsData as UserOpportunity[] | null

    userOpportunities = (userOpps || []).reduce((acc: any, uo: UserOpportunity) => {
      acc[uo.opportunity_id] = {
        match_score: uo.match_score,
        match_reasons: uo.match_reasons,
        status: uo.status,
      }
      return acc
    }, {} as Record<string, { match_score: number; match_reasons: unknown; status: string }>)
  }

  // Deduplicate by title (case-insensitive) — keep first occurrence
  const seenTitles = new Set<string>()
  const deduped = (opportunities || []).filter((opp: Opportunity) => {
    const key = (opp.title || "").trim().toLowerCase()
    if (!key) return false
    if (seenTitles.has(key)) return false
    seenTitles.add(key)
    return true
  })

  // Deprioritize unverified/stale opportunities — verified ones sort first
  deduped.sort((a: Opportunity, b: Opportunity) => {
    const aVerified = a.last_verified ? 1 : 0
    const bVerified = b.last_verified ? 1 : 0
    if (aVerified !== bVerified) return bVerified - aVerified
    return 0 // preserve existing order within each group
  })

  const mapped = deduped.map((opp: Opportunity) => {
    const userOpp = userOpportunities[opp.id]
    return {
      id: opp.id,
      url: opp.url,
      title: opp.title,
      company: opp.company,
      location: opp.location,
      type: opp.type,
      category: opp.category,
      suggestedCategory: opp.suggested_category,
      gradeLevels: opp.grade_levels,
      locationType: opp.location_type,
      startDate: opp.start_date,
      endDate: opp.end_date,
      cost: opp.cost,
      timeCommitment: opp.time_commitment,
      prizes: opp.prizes,
      contactEmail: opp.contact_email,
      applicationUrl: opp.application_url,
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
      sourceUrl: opp.source_url,
      timingType: opp.timing_type,
      extractionConfidence: opp.extraction_confidence,
      isActive: opp.is_active,
      isExpired: opp.is_expired,
      lastVerified: opp.last_verified,
      recheckAt: opp.recheck_at,
      nextCycleExpected: opp.next_cycle_expected,
      dateDiscovered: opp.date_discovered,
      createdAt: opp.created_at,
      updatedAt: opp.updated_at,
      status: userOpp?.status || null,
      saved: userOpp?.status === "saved",
    }
  })

  return {
    opportunities: mapped,
    totalCount: count || 0,
    page,
    pageSize,
    hasMore: offset + pageSize < (count || 0),
  }
}

export interface OpportunitiesBootstrapPayload {
  opportunities: Awaited<ReturnType<typeof getOpportunities>>
  statuses: Record<string, OpportunityStatus>
  userProfileId?: string
  personalizedDiscovery: boolean
  personalizedEnabledByDefault: boolean
  personalizedOpportunities: Awaited<ReturnType<typeof getPersonalizedOpportunities>>["opportunities"]
  profileComplete: boolean
}

export async function getOpportunitiesBootstrap(pageSize: number = 50): Promise<OpportunitiesBootstrapPayload> {
  const [opportunitiesResult, statuses, userProfile] = await Promise.all([
    getOpportunities({ page: 1, pageSize }),
    getStatuses(),
    getUserProfile(),
  ])

  const hasPersonalizationSignals = Boolean(
    userProfile?.interests?.length ||
    userProfile?.career_goals?.trim() ||
    userProfile?.preferred_opportunity_types?.length ||
    userProfile?.academic_strengths?.length
  )

  let personalizedResult: Awaited<ReturnType<typeof getPersonalizedOpportunities>> = {
    opportunities: [],
    profileComplete: false,
  }

  if (hasPersonalizationSignals) {
    personalizedResult = await getPersonalizedOpportunities(20)
  }

  return {
    opportunities: opportunitiesResult,
    statuses,
    userProfileId: userProfile?.id,
    personalizedDiscovery: Boolean(userProfile?.id),
    personalizedEnabledByDefault: hasPersonalizationSignals && personalizedResult.opportunities.length > 0,
    personalizedOpportunities: personalizedResult.opportunities,
    profileComplete: personalizedResult.profileComplete,
  }
}

export async function getOpportunitiesByIds(ids: string[]) {
  const authUser = await getCurrentUser()
  const supabase = await createClient()

  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .in("id", ids)

  const opportunities = data as Opportunity[] | null

  if (error) throw new Error(error.message)

  let userOpportunities: Record<string, { match_score: number; match_reasons: unknown; status: string }> =
    {}

  if (authUser) {
    const { data: userOppsData } = await supabase
      .from("user_opportunities")
      .select("opportunity_id, match_score, match_reasons, status")
      .eq("user_id", authUser.id)
      .in("opportunity_id", ids)

    const userOpps = userOppsData as UserOpportunity[] | null

    userOpportunities = (userOpps || []).reduce((acc: any, uo: UserOpportunity) => {
      acc[uo.opportunity_id] = {
        match_score: uo.match_score,
        match_reasons: uo.match_reasons,
        status: uo.status,
      }
      return acc
    }, {} as Record<string, { match_score: number; match_reasons: unknown; status: string }>)
  }

  return (opportunities || []).map((opp: Opportunity) => {
    const userOpp = userOpportunities[opp.id]
    return {
      id: opp.id,
      url: opp.url,
      title: opp.title,
      company: opp.company,
      location: opp.location,
      type: opp.type,
      category: opp.category,
      suggestedCategory: opp.suggested_category,
      gradeLevels: opp.grade_levels,
      locationType: opp.location_type,
      startDate: opp.start_date,
      endDate: opp.end_date,
      cost: opp.cost,
      timeCommitment: opp.time_commitment,
      prizes: opp.prizes,
      contactEmail: opp.contact_email,
      applicationUrl: opp.application_url,
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
      sourceUrl: opp.source_url,
      timingType: opp.timing_type,
      extractionConfidence: opp.extraction_confidence,
      isActive: opp.is_active,
      isExpired: opp.is_expired,
      lastVerified: opp.last_verified,
      recheckAt: opp.recheck_at,
      nextCycleExpected: opp.next_cycle_expected,
      dateDiscovered: opp.date_discovered,
      createdAt: opp.created_at,
      updatedAt: opp.updated_at,
      status: userOpp?.status || null,
      saved: userOpp?.status === "saved",
    }
  })
}

export interface SearchOpportunitiesResult {
  opportunities: Awaited<ReturnType<typeof getOpportunities>>["opportunities"]
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
  const authUser = await getCurrentUser()
  const supabase = await createClient()

  const sanitizedQuery = query.trim()

  // If no query, return first page of opportunities
  if (!sanitizedQuery) {
    const result = await getOpportunities(filters)
    return { opportunities: result.opportunities, discoveryTriggered: false, newOpportunitiesFound: 0 }
  }

  // Build the search query with ilike on title and company
  const searchPattern = `%${sanitizedQuery}%`

  let dbQuery = supabase
    .from("opportunities")
    .select("*")
    .eq("is_active", true)
    .or(`title.ilike.${searchPattern},company.ilike.${searchPattern},category.ilike.${searchPattern}`)
    .limit(50)

  // Apply filters
  if (filters?.type) dbQuery = dbQuery.eq("type", filters.type)
  if (filters?.category) dbQuery = dbQuery.eq("category", filters.category)
  if (filters?.remote !== undefined) dbQuery = dbQuery.eq("remote", filters.remote)

  const { data, error } = await dbQuery.order("deadline", { ascending: true })
  const opportunities = data as Opportunity[] | null

  if (error) throw new Error(error.message)

  // Get user opportunities for match scores
  let userOpportunities: Record<string, { match_score: number; match_reasons: unknown; status: string }> =
    {}

  if (authUser) {
    const { data: userOppsData } = await supabase
      .from("user_opportunities")
      .select("opportunity_id, match_score, match_reasons, status")
      .eq("user_id", authUser.id)

    const userOpps = userOppsData as UserOpportunity[] | null

    userOpportunities = (userOpps || []).reduce((acc: any, uo: UserOpportunity) => {
      acc[uo.opportunity_id] = {
        match_score: uo.match_score,
        match_reasons: uo.match_reasons,
        status: uo.status,
      }
      return acc
    }, {} as Record<string, { match_score: number; match_reasons: unknown; status: string }>)
  }

  const mapOpportunity = (opp: Opportunity) => {
    const userOpp = userOpportunities[opp.id]
    return {
      id: opp.id,
      url: opp.url,
      title: opp.title,
      company: opp.company,
      location: opp.location,
      type: opp.type,
      category: opp.category,
      suggestedCategory: opp.suggested_category,
      gradeLevels: opp.grade_levels,
      locationType: opp.location_type,
      startDate: opp.start_date,
      endDate: opp.end_date,
      cost: opp.cost,
      timeCommitment: opp.time_commitment,
      prizes: opp.prizes,
      contactEmail: opp.contact_email,
      applicationUrl: opp.application_url,
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
      sourceUrl: opp.source_url,
      timingType: opp.timing_type,
      extractionConfidence: opp.extraction_confidence,
      isActive: opp.is_active,
      isExpired: opp.is_expired,
      lastVerified: opp.last_verified,
      recheckAt: opp.recheck_at,
      nextCycleExpected: opp.next_cycle_expected,
      dateDiscovered: opp.date_discovered,
      createdAt: opp.created_at,
      updatedAt: opp.updated_at,
      status: userOpp?.status || null,
      saved: userOpp?.status === "saved",
    }
  }

  // Deduplicate by title before returning
  const seenSearchTitles = new Set<string>()
  const dedupedSearch = (opportunities || []).filter((opp: Opportunity) => {
    const key = (opp.title || "").trim().toLowerCase()
    if (!key || key === "unknown") return false
    if (seenSearchTitles.has(key)) return false
    seenSearchTitles.add(key)
    return true
  })

  // If we have results, return them
  if (dedupedSearch.length > 0) {
    return {
      opportunities: dedupedSearch.map(mapOpportunity),
      discoveryTriggered: false,
      newOpportunitiesFound: 0,
    }
  }

  // No results and query is long enough: trigger discovery (with cooldown check)
  if (sanitizedQuery.length >= 3) {
    // Check cooldown to prevent repeated discovery runs
    if (!canTriggerDiscovery(sanitizedQuery)) {
      console.log(`[Search] Discovery cooldown active for "${sanitizedQuery}", skipping`)
      return {
        opportunities: [],
        discoveryTriggered: false,
        newOpportunitiesFound: 0,
      }
    }

    // Mark as triggered before running to prevent concurrent runs
    markDiscoveryTriggered(sanitizedQuery)

    const discoveryResult = await triggerDiscovery(sanitizedQuery)

    if (discoveryResult.success && discoveryResult.newOpportunities && discoveryResult.newOpportunities > 0) {
      // Re-run search to pick up newly discovered opportunities
      const { data: newOppsData, error: newError } = await dbQuery
      const newOpportunities = newOppsData as Opportunity[] | null

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

  const { data, error } = await supabase
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

  const userOpportunities = data as any[] | null

  if (error) throw new Error(error.message)

  return (userOpportunities || []).map((uo: any) => ({
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
    } as any,
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
    } as any,
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

// ============================================================================
// PERSONALIZED OPPORTUNITIES — Matching Algorithm
// ============================================================================

interface UserProfile {
  interests: string[]
  career_goals: string | null
  preferred_opportunity_types: string[]
  academic_strengths: string[]
  grade_level: number | null
  location: string | null
  availability: string | null
}

interface MatchResult {
  score: number
  reasons: string[]
}

/**
 * Score a single opportunity against a user profile.
 * Returns 0-100 score and human-readable match reasons.
 *
 * Signals (total up to 100):
 *   - Interest match (0-35): user interests vs opp title/description/category/skills
 *   - Career goal match (0-20): keywords from career_goals vs opp text
 *   - Opportunity type preference (0-15): preferred_opportunity_types vs opp.type
 *   - Academic strength match (0-15): academic_strengths vs opp skills
 *   - Grade level fit (0-10): user grade_level in opp.grade_levels
 *   - Base relevance (5): every active opportunity gets a small base score
 */
function scoreOpportunity(opp: Opportunity, profile: UserProfile): MatchResult {
  let score = 0
  const reasons: string[] = []

  // Precompute lowercase text fields for the opportunity
  const oppTitle = (opp.title || '').toLowerCase()
  const oppDesc = (opp.description || '').toLowerCase()
  const oppCategory = (opp.category || '').toLowerCase()
  const oppCompany = (opp.company || '').toLowerCase()
  const oppSkills = (opp.skills || []).map((s: string) => s.toLowerCase())
  const oppType = (opp.type || '').toLowerCase()
  const oppText = `${oppTitle} ${oppDesc} ${oppCategory} ${oppCompany} ${oppSkills.join(' ')}`

  // --- 1) Interest match (up to 35 pts) ---
  if (profile.interests && profile.interests.length > 0) {
    let interestHits = 0
    const matchedInterests: string[] = []

    for (const interest of profile.interests) {
      const lowerInterest = interest.toLowerCase()
      // Check if the interest appears in the opportunity's combined text
      if (oppText.includes(lowerInterest)) {
        interestHits++
        matchedInterests.push(interest)
      } else {
        // Fuzzy: check if any word from the interest appears in opp text
        const words = lowerInterest.split(/\s+/).filter(w => w.length > 3)
        for (const word of words) {
          if (oppText.includes(word)) {
            interestHits += 0.5
            matchedInterests.push(interest)
            break
          }
        }
      }
    }

    const interestScore = Math.min(35, Math.round((interestHits / profile.interests.length) * 35))
    score += interestScore
    if (matchedInterests.length > 0) {
      const unique = [...new Set(matchedInterests)]
      reasons.push(`Matches your interest${unique.length > 1 ? 's' : ''} in ${unique.slice(0, 3).join(', ')}`)
    }
  }

  // --- 2) Career goal match (up to 20 pts) ---
  if (profile.career_goals && profile.career_goals.trim().length > 0) {
    const goalWords = profile.career_goals
      .toLowerCase()
      .split(/[\s,;.]+/)
      .filter(w => w.length > 3)
      // Remove common stop words
      .filter(w => !['want', 'become', 'like', 'would', 'with', 'that', 'this', 'have', 'from', 'been', 'into', 'more', 'some'].includes(w))

    let goalHits = 0
    for (const word of goalWords) {
      if (oppText.includes(word)) goalHits++
    }

    if (goalWords.length > 0) {
      const goalScore = Math.min(20, Math.round((goalHits / goalWords.length) * 20))
      score += goalScore
      if (goalHits > 0) {
        reasons.push('Aligns with your career goals')
      }
    }
  }

  // --- 3) Opportunity type preference (up to 15 pts) ---
  if (profile.preferred_opportunity_types && profile.preferred_opportunity_types.length > 0) {
    const prefTypes = profile.preferred_opportunity_types.map(t => t.toLowerCase())
    if (prefTypes.includes(oppType) || prefTypes.some(t => oppType.includes(t) || t.includes(oppType))) {
      score += 15
      reasons.push(`Matches your preferred type: ${opp.type}`)
    }
  }

  // --- 4) Academic strength match (up to 15 pts) ---
  if (profile.academic_strengths && profile.academic_strengths.length > 0) {
    let strengthHits = 0
    const matchedStrengths: string[] = []

    for (const strength of profile.academic_strengths) {
      const lowerStrength = strength.toLowerCase()
      if (oppSkills.some(s => s.includes(lowerStrength) || lowerStrength.includes(s))) {
        strengthHits++
        matchedStrengths.push(strength)
      } else if (oppText.includes(lowerStrength)) {
        strengthHits += 0.5
        matchedStrengths.push(strength)
      }
    }

    const strengthScore = Math.min(15, Math.round((strengthHits / profile.academic_strengths.length) * 15))
    score += strengthScore
    if (matchedStrengths.length > 0) {
      const unique = [...new Set(matchedStrengths)]
      reasons.push(`Leverages your strength in ${unique.slice(0, 2).join(', ')}`)
    }
  }

  // --- 5) Grade level fit (up to 10 pts) ---
  if (profile.grade_level && opp.grade_levels && opp.grade_levels.length > 0) {
    if (opp.grade_levels.includes(profile.grade_level)) {
      score += 10
      reasons.push('Available for your grade level')
    }
  } else if (profile.grade_level && (!opp.grade_levels || opp.grade_levels.length === 0)) {
    // No grade restriction = open to all, small bonus
    score += 5
  }

  // --- 6) Base relevance ---
  score += 5

  // --- 7) Staleness penalty ---
  if (!opp.last_verified) {
    score -= 5 // Never verified (bulk import)
  } else {
    const daysSinceVerified = (Date.now() - new Date(opp.last_verified).getTime()) / 86400000
    if (daysSinceVerified > 30) score -= 3
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons,
  }
}

/**
 * Fetch opportunities personalized for the current user.
 * Returns only opportunities with matchScore >= minScore, sorted by score desc.
 */
export async function getPersonalizedOpportunities(minScore: number = 20): Promise<{
  opportunities: ReturnType<typeof formatOpportunity>[]
  profileComplete: boolean
}> {
  const authUser = await getCurrentUser()
  const supabase = await createClient()

  if (!authUser) {
    return { opportunities: [], profileComplete: false }
  }

  // Fetch user profile
  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", authUser.id)
    .single()

  const profile = profileData as UserProfile | null

  if (!profile || (
    (!profile.interests || profile.interests.length === 0) &&
    (!profile.career_goals || profile.career_goals.trim() === '') &&
    (!profile.preferred_opportunity_types || profile.preferred_opportunity_types.length === 0) &&
    (!profile.academic_strengths || profile.academic_strengths.length === 0)
  )) {
    // No profile or completely empty — can't personalize
    return { opportunities: [], profileComplete: false }
  }

  // Build interest-based pre-filter to avoid fetching all 4000+ rows
  // Only fetch opportunities that mention user's interests, strengths, or preferred types
  const filterKeywords: string[] = []
  if (profile.interests) filterKeywords.push(...profile.interests)
  if (profile.academic_strengths) filterKeywords.push(...profile.academic_strengths)
  if (profile.preferred_opportunity_types) filterKeywords.push(...profile.preferred_opportunity_types)

  let personalQuery = supabase
    .from("opportunities")
    .select("*")
    .eq("is_active", true)
    .neq("title", "Unknown")
    .neq("title", "")

  // If we have keywords, pre-filter with OR conditions (title/category/skills matches)
  if (filterKeywords.length > 0) {
    const uniqueKeywords = [...new Set(filterKeywords.map(k => k.toLowerCase()))]
      .slice(0, 10) // Cap at 10 keywords to keep query reasonable
    const orConditions = uniqueKeywords
      .flatMap(kw => [
        `title.ilike.%${kw}%`,
        `category.ilike.%${kw}%`,
        `description.ilike.%${kw}%`,
      ])
      .join(",")
    personalQuery = personalQuery.or(orConditions)
  }

  const { data, error } = await personalQuery
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) throw new Error(error.message)

  const rawOpportunities = (data as Opportunity[]) || []

  // Deduplicate by title (case-insensitive) before scoring
  const seenTitles = new Set<string>()
  const opportunities = rawOpportunities.filter((opp: Opportunity) => {
    const key = (opp.title || "").trim().toLowerCase()
    if (!key) return false
    if (seenTitles.has(key)) return false
    seenTitles.add(key)
    return true
  })

  // Fetch user_opportunities for saved status
  const { data: userOppsData } = await supabase
    .from("user_opportunities")
    .select("opportunity_id, match_score, match_reasons, status")
    .eq("user_id", authUser.id)

  const userOpps = (userOppsData as UserOpportunity[] | null) || []
  const userOpportunities = userOpps.reduce((acc: any, uo: UserOpportunity) => {
    acc[uo.opportunity_id] = {
      match_score: uo.match_score,
      match_reasons: uo.match_reasons,
      status: uo.status,
    }
    return acc
  }, {} as Record<string, { match_score: number; match_reasons: unknown; status: string }>)

  // Score and filter
  const scored = opportunities
    .map(opp => {
      const { score, reasons } = scoreOpportunity(opp, profile)
      return { opp, score, reasons }
    })
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score)

  // Map to frontend format with real match scores
  const result = scored.map(({ opp, score, reasons }) => {
    const userOpp = userOpportunities[opp.id]
    return {
      id: opp.id,
      url: opp.url,
      title: opp.title,
      company: opp.company,
      location: opp.location,
      type: opp.type,
      category: opp.category,
      suggestedCategory: opp.suggested_category,
      gradeLevels: opp.grade_levels,
      locationType: opp.location_type,
      startDate: opp.start_date,
      endDate: opp.end_date,
      cost: opp.cost,
      timeCommitment: opp.time_commitment,
      prizes: opp.prizes,
      contactEmail: opp.contact_email,
      applicationUrl: opp.application_url,
      matchScore: score,
      matchReasons: reasons,
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
      sourceUrl: opp.source_url,
      timingType: opp.timing_type,
      extractionConfidence: opp.extraction_confidence,
      isActive: opp.is_active,
      isExpired: opp.is_expired,
      lastVerified: opp.last_verified,
      recheckAt: opp.recheck_at,
      nextCycleExpected: opp.next_cycle_expected,
      dateDiscovered: opp.date_discovered,
      createdAt: opp.created_at,
      updatedAt: opp.updated_at,
      status: userOpp?.status || null,
      saved: userOpp?.status === "saved",
    }
  })

  return { opportunities: result, profileComplete: true }
}

// Helper to make the return type inferrable (used in the type above)
function formatOpportunity(opp: any) {
  return opp as any
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

  const userData = user as any
  const oppData = opportunity as any

  const userSkills = new Set((userData?.skills || []).map((s: string) => s.toLowerCase()))
  const oppSkills = new Set((oppData?.skills || []).map((s: string) => s.toLowerCase()))

  let overlap = 0
  for (const skill of oppSkills) {
    if (userSkills.has(skill)) overlap++
  }

  const skillScore = oppSkills.size > 0 ? Math.round((overlap / oppSkills.size) * 50) : 25
  const interestBonus = (userData?.interests || []).some((i: string) =>
    oppData?.category?.toLowerCase().includes(i.toLowerCase())
  )
    ? 25
    : 0
  const locationBonus =
    oppData?.remote ||
      (userData?.location && oppData?.location?.toLowerCase().includes(userData.location.toLowerCase()))
      ? 15
      : 0

  const score = Math.min(100, skillScore + interestBonus + locationBonus + 10)

  const reasons: string[] = []
  if (overlap > 0) reasons.push(`${overlap} matching skills`)
  if (interestBonus > 0) reasons.push("Matches your interests")
  if (locationBonus > 0) reasons.push(oppData?.remote ? "Remote opportunity" : "Location match")

  const { error } = await supabase.from("user_opportunities").upsert(
    {
      user_id: authUser.id,
      opportunity_id: opportunityId,
      match_score: score,
      match_reasons: reasons,
      status: "curated",
    } as any,
    { onConflict: "user_id,opportunity_id" }
  )

  if (error) throw new Error(error.message)

  revalidatePath("/opportunities")
  return { score, reasons }
}
