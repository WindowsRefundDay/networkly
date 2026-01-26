/**
 * AI Tool Executors - Execute tool calls and return results
 * 
 * All database operations are performed here.
 * Results are formatted for the AI to interpret and respond naturally.
 */

import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

/**
 * Get user profile with skills, interests, and goals
 */
export async function getUserProfile(userId: string, supabaseClient?: SupabaseClient<Database>): Promise<ToolResult> {
  try {
    const supabase = (supabaseClient || await createClient()) as SupabaseClient<Database>
    
    // Get user and profile data in parallel
    const [
      { data: user, error: userError },
      { data: userProfile }
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, headline, bio, location, skills, interests, university, graduation_year')
        .eq('id', userId)
        .single(),
      supabase
        .from('user_profiles')
        .select('career_goals, grade_level, preferred_opportunity_types, academic_strengths')
        .eq('user_id', userId)
        .single()
    ])

    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }

    return {
      success: true,
      data: {
        name: user.name,
        headline: user.headline,
        location: user.location,
        skills: user.skills,
        interests: user.interests,
        university: user.university,
        graduationYear: user.graduation_year,
        careerGoals: userProfile?.career_goals,
        gradeLevel: userProfile?.grade_level,
        preferredTypes: userProfile?.preferred_opportunity_types,
        academicStrengths: userProfile?.academic_strengths,
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to get profile' }
  }
}

/**
 * Get user's extracurricular activities
 */
export async function getExtracurriculars(userId: string): Promise<ToolResult> {
  try {
    const supabase = await createClient()
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }

    // Get extracurriculars
    const { data: ecs, error: ecsError } = await supabase
      .from('extracurriculars')
      .select('id, title, organization, type, start_date, end_date, description')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })

    if (ecsError) {
      return { success: false, error: 'Failed to get activities' }
    }

    return {
      success: true,
      data: {
        count: ecs?.length || 0,
        activities: (ecs || []).map(ec => ({
          title: ec.title,
          organization: ec.organization,
          type: ec.type,
          period: `${ec.start_date} - ${ec.end_date}`,
          description: ec.description,
        }))
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to get activities' }
  }
}

/**
 * Get user's saved/bookmarked opportunities
 */
export async function getSavedOpportunities(userId: string): Promise<ToolResult> {
  try {
    const supabase = await createClient()
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }

    // Get saved opportunities with opportunity details
    const { data: saved, error: savedError } = await supabase
      .from('user_opportunities')
      .select(`
        created_at,
        opportunities (
          id,
          title,
          company,
          location,
          type,
          category,
          deadline,
          location_type
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'saved')
      .order('created_at', { ascending: false })
      .limit(20)

    if (savedError) {
      return { success: false, error: 'Failed to get saved opportunities' }
    }

    return {
      success: true,
      data: {
        count: saved?.length || 0,
        opportunities: (saved || []).map(s => {
          const opp = s.opportunities as any
          return {
            id: opp.id,
            title: opp.title,
            organization: opp.company,
            location: opp.location_type === 'Remote' || opp.location_type === 'online' ? 'Remote' : opp.location,
            type: opp.type,
            category: opp.category,
            deadline: opp.deadline ? new Date(opp.deadline).toLocaleDateString() : null,
          }
        })
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to get saved opportunities' }
  }
}

/**
 * Get user's projects
 */
export async function getProjects(userId: string): Promise<ToolResult> {
  try {
    const supabase = await createClient()
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }

    // Get projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, title, description, status, category, tags, progress')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10)

    if (projectsError) {
      return { success: false, error: 'Failed to get projects' }
    }

    return {
      success: true,
      data: {
        count: projects?.length || 0,
        projects: (projects || []).map(p => ({
          title: p.title,
          description: p.description?.slice(0, 100) + (p.description && p.description.length > 100 ? '...' : ''),
          status: p.status,
          category: p.category,
          tags: p.tags,
          progress: p.progress,
        }))
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to get projects' }
  }
}

/**
 * Get user's goals
 */
export async function getGoals(userId: string): Promise<ToolResult> {
  try {
    const supabase = await createClient()
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }

    // Get goals
    const { data: goals, error: goalsError } = await supabase
      .from('user_goals')
      .select('id, goal_text, roadmap')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5)

    if (goalsError) {
      return { success: false, error: 'Failed to get goals' }
    }

    return {
      success: true,
      data: {
        count: goals?.length || 0,
        goals: (goals || []).map(g => ({
          goal: g.goal_text,
          roadmap: g.roadmap,
        }))
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to get goals' }
  }
}

/**
 * Search for opportunities in database
 */
export async function searchOpportunities(
  userId: string,
  params: { query: string; category?: string; type?: string; limit?: number }
): Promise<ToolResult> {
  try {
    const supabase = await createClient()
    const { query, category, type, limit = 5 } = params
    const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2)

    // Build the query
    let dbQuery = supabase
      .from('opportunities')
      .select('id, title, company, location, type, category, deadline, location_type, description, skills, url, source_url')
      .eq('is_active', true)

    // Apply category filter
    if (category) {
      dbQuery = dbQuery.ilike('category', `%${category}%`)
    }

    // Apply type filter
    if (type) {
      dbQuery = dbQuery.ilike('type', `%${type}%`)
    }

    // Apply search filter - use OR for title, company, category, description
    if (query) {
      const searchPattern = `%${query}%`
      dbQuery = dbQuery.or(`title.ilike.${searchPattern},company.ilike.${searchPattern},category.ilike.${searchPattern},description.ilike.${searchPattern}`)
    }

    // Order and limit
    const { data: opportunities, error } = await dbQuery
      .order('deadline', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[searchOpportunities]', error)
      return { success: false, error: 'Failed to search opportunities' }
    }

    return {
      success: true,
      data: {
        count: opportunities?.length || 0,
        query: query,
        opportunities: (opportunities || []).map(o => ({
          id: o.id,
          title: o.title,
          organization: o.company,
          location: o.location_type === 'Remote' || o.location_type === 'online' ? 'Remote' : o.location,
          type: o.type,
          category: o.category,
          deadline: o.deadline ? new Date(o.deadline).toLocaleDateString() : null,
          description: o.description?.slice(0, 150) + (o.description && o.description.length > 150 ? '...' : ''),
          skills: Array.isArray(o.skills) ? o.skills.slice(0, 5) : [],
          url: o.url || o.source_url || null,
        }))
      }
    }
  } catch (error) {
    console.error('[searchOpportunities]', error)
    return { success: false, error: 'Failed to search opportunities' }
  }
}

/**
 * Smart search - Profile-aware opportunity search
 * Automatically fetches user profile and filters/ranks by relevance
 */
export async function smartSearchOpportunities(
  userId: string,
  params: { query?: string; category?: string; type?: string; limit?: number },
  supabaseClient?: SupabaseClient<Database>
): Promise<ToolResult> {
  try {
    const supabase = (supabaseClient || await createClient()) as SupabaseClient<Database>
    const { query = '', category, type, limit = 10 } = params

    // Get user and profile data in parallel for personalization
    const [
      { data: user, error: userError },
      { data: userProfile }
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id, location, skills, interests')
        .eq('id', userId)
        .single(),
      supabase
        .from('user_profiles')
        .select('grade_level, preferred_opportunity_types, academic_strengths')
        .eq('user_id', userId)
        .single()
    ])

    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }

    // Build search terms from query + user profile
    const userInterests = user.interests || []
    const userSkills = user.skills || []
    const preferredTypes = userProfile?.preferred_opportunity_types || []
    const academicStrengths = userProfile?.academic_strengths || []
    
    // Combine all terms for matching
    const allTerms = [
      ...query.toLowerCase().split(' ').filter(t => t.length > 2),
      ...userInterests.map((i: string) => i.toLowerCase()),
      ...userSkills.map((s: string) => s.toLowerCase()),
      ...academicStrengths.map((s: string) => s.toLowerCase()),
    ].slice(0, 20) // Limit to prevent huge queries

    // Build query
    let dbQuery = supabase
      .from('opportunities')
      .select('id, title, company, location, type, category, deadline, location_type, description, skills, url, source_url')
      .eq('is_active', true)

    // Category filter
    if (category) {
      dbQuery = dbQuery.ilike('category', `%${category}%`)
    }

    // Type filter - from param or user preferences
    if (type) {
      dbQuery = dbQuery.ilike('type', `%${type}%`)
    } else if (preferredTypes.length > 0) {
      // Build OR condition for preferred types
      const typePattern = preferredTypes.map((t: string) => `type.ilike.%${t}%`).join(',')
      dbQuery = dbQuery.or(typePattern)
    }

    // Search by terms (query + profile interests/skills)
    if (allTerms.length > 0 || query) {
      const searchPattern = query ? `%${query}%` : `%${allTerms[0]}%`
      dbQuery = dbQuery.or(`title.ilike.${searchPattern},company.ilike.${searchPattern},category.ilike.${searchPattern},description.ilike.${searchPattern}`)
    }

    // Fetch opportunities
    const { data: opportunities, error } = await dbQuery
      .order('deadline', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit * 2) // Fetch extra for ranking

    if (error) {
      console.error('[smartSearchOpportunities]', error)
      return { success: false, error: 'Failed to search opportunities' }
    }

    // Score and rank opportunities by profile match
    const scoredOpportunities = (opportunities || []).map(opp => {
      let score = 0
      const matchReasons: string[] = []

      // Check skill matches
      const oppSkills = Array.isArray(opp.skills) ? opp.skills : []
      const oppSkillsLower = oppSkills.map((s: string) => s.toLowerCase())
      const skillMatches = userSkills.filter((s: string) => 
        oppSkillsLower.some((os: string) => os.includes(s.toLowerCase()) || s.toLowerCase().includes(os))
      )
      if (skillMatches.length > 0) {
        score += skillMatches.length * 10
        matchReasons.push(`Matches your skills: ${skillMatches.slice(0, 2).join(', ')}`)
      }

      // Check interest matches
      const titleLower = opp.title.toLowerCase()
      const descLower = (opp.description || '').toLowerCase()
      const interestMatches = userInterests.filter((i: string) => 
        titleLower.includes(i.toLowerCase()) || descLower.includes(i.toLowerCase())
      )
      if (interestMatches.length > 0) {
        score += interestMatches.length * 8
        matchReasons.push(`Matches your interest in ${interestMatches[0]}`)
      }

      // Location match
      const isRemote = opp.location_type === 'Remote' || opp.location_type === 'online'
      if (isRemote) {
        score += 5
        matchReasons.push('Remote-friendly')
      } else if (user.location && opp.location?.toLowerCase().includes(user.location.toLowerCase())) {
        score += 7
        matchReasons.push(`Near ${user.location}`)
      }

      // Deadline urgency bonus (sooner = higher priority)
      if (opp.deadline) {
        const daysUntil = Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        if (daysUntil > 0 && daysUntil <= 14) {
          score += 5
          matchReasons.push('Deadline soon')
        }
      }

      return { ...opp, score, matchReasons }
    })

    // Sort by score and take top results
    scoredOpportunities.sort((a, b) => b.score - a.score)
    const topOpportunities = scoredOpportunities.slice(0, limit)

    return {
      success: true,
      data: {
        count: topOpportunities.length,
        query: query || 'personalized recommendations',
        profileContext: {
          interests: userInterests.slice(0, 3),
          skills: userSkills.slice(0, 3),
          location: user.location,
        },
        opportunities: topOpportunities.map(o => ({
          id: o.id,
          title: o.title,
          organization: o.company,
          location: o.location_type === 'Remote' || o.location_type === 'online' ? 'Remote' : o.location,
          type: o.type,
          category: o.category,
          deadline: o.deadline ? new Date(o.deadline).toLocaleDateString() : null,
          description: o.description?.slice(0, 150) + (o.description && o.description.length > 150 ? '...' : ''),
          skills: Array.isArray(o.skills) ? o.skills.slice(0, 5) : [],
          url: o.url || o.source_url || null,
          matchReasons: o.matchReasons.slice(0, 2),
          matchScore: o.score,
        }))
      }
    }
  } catch (error) {
    console.error('[smartSearchOpportunities]', error)
    return { success: false, error: 'Failed to search opportunities' }
  }
}

/**
 * Filter opportunities by deadline within X days
 */
export async function filterByDeadline(
  userId: string,
  params: { days: number; category?: string; type?: string; limit?: number }
): Promise<ToolResult> {
  try {
    const supabase = await createClient()
    const { days, category, type, limit = 10 } = params

    const now = new Date()
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    // Build query
    let dbQuery = supabase
      .from('opportunities')
      .select('id, title, company, location, type, category, deadline, location_type, description, skills, url, source_url')
      .eq('is_active', true)
      .gte('deadline', now.toISOString())
      .lte('deadline', futureDate.toISOString())

    if (category) {
      dbQuery = dbQuery.ilike('category', `%${category}%`)
    }
    if (type) {
      dbQuery = dbQuery.ilike('type', `%${type}%`)
    }

    const { data: opportunities, error } = await dbQuery
      .order('deadline', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('[filterByDeadline]', error)
      return { success: false, error: 'Failed to filter by deadline' }
    }

    return {
      success: true,
      data: {
        count: opportunities?.length || 0,
        timeframe: `next ${days} days`,
        opportunities: (opportunities || []).map(o => {
          const daysUntil = o.deadline 
            ? Math.ceil((new Date(o.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null

          return {
            id: o.id,
            title: o.title,
            organization: o.company,
            location: o.location_type === 'Remote' || o.location_type === 'online' ? 'Remote' : o.location,
            type: o.type,
            category: o.category,
            deadline: o.deadline ? new Date(o.deadline).toLocaleDateString() : null,
            daysUntilDeadline: daysUntil,
            urgency: daysUntil !== null && daysUntil <= 3 ? 'urgent' : daysUntil !== null && daysUntil <= 7 ? 'soon' : 'upcoming',
            description: o.description?.slice(0, 150) + (o.description && o.description.length > 150 ? '...' : ''),
            skills: Array.isArray(o.skills) ? o.skills.slice(0, 5) : [],
            url: o.url || o.source_url || null,
          }
        })
      }
    }
  } catch (error) {
    console.error('[filterByDeadline]', error)
    return { success: false, error: 'Failed to filter by deadline' }
  }
}

/**
 * Personalized web discovery - builds smart queries from user profile
 * Returns a flag to trigger the discovery stream with profile-enhanced query
 */
export async function personalizedWebDiscovery(
  userId: string,
  params: { topic?: string; category?: string },
  supabaseClient?: SupabaseClient<Database>
): Promise<ToolResult> {
  try {
    const supabase = (supabaseClient || await createClient()) as SupabaseClient<Database>
    const { topic, category } = params

    // Get user and profile data in parallel for building personalized query
    const [
      { data: user, error: userError },
      { data: userProfile }
    ] = await Promise.all([
      supabase
        .from('users')
        .select('location, interests, skills')
        .eq('id', userId)
        .single(),
      supabase
        .from('user_profiles')
        .select('grade_level, preferred_opportunity_types, academic_strengths')
        .eq('user_id', userId)
        .single()
    ])

    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }

    // Build a smart search query from user profile
    const queryParts: string[] = []

    // Add topic if provided
    if (topic) {
      queryParts.push(topic)
    }

    // Add top interests
    const interests = user.interests || []
    if (interests.length > 0 && !topic) {
      queryParts.push(...interests.slice(0, 2))
    }

    // Add category
    if (category) {
      queryParts.push(category)
    }

    // Add grade level context
    const gradeLevel = userProfile?.grade_level
    if (gradeLevel) {
      // grade_level is a number representing grade (9-12 for high school, 13+ for college)
      if (typeof gradeLevel === 'number') {
        if (gradeLevel >= 9 && gradeLevel <= 12) {
          queryParts.push('high school students')
        } else if (gradeLevel >= 13) {
          queryParts.push('college students')
        }
      } else if (typeof gradeLevel === 'string') {
        const gradeLevelStr = String(gradeLevel).toLowerCase()
        if (gradeLevelStr.includes('high school')) {
          queryParts.push('high school students')
        } else if (gradeLevelStr.includes('college') || gradeLevelStr.includes('undergraduate')) {
          queryParts.push('college students')
        }
      }
    }

    // Add preferred types
    const preferredTypes = userProfile?.preferred_opportunity_types || []
    if (preferredTypes.length > 0) {
      queryParts.push(preferredTypes[0])
    }

    // Add location if available
    const location = user.location
    if (location) {
      queryParts.push(location)
    }

    // Build final query
    const smartQuery = queryParts.slice(0, 5).join(' ') || 'student opportunities programs'

    return {
      success: true,
      data: {
        triggerDiscovery: true,
        query: smartQuery,
        isPersonalized: true,
        profileContext: {
          interests: interests.slice(0, 3),
          location: location,
          gradeLevel: gradeLevel,
        }
      }
    }
  } catch (error) {
    console.error('[personalizedWebDiscovery]', error)
    return { success: false, error: 'Failed to prepare personalized discovery' }
  }
}

/**
 * Bookmark an opportunity for the user
 */
export async function bookmarkOpportunity(
  userId: string,
  params: { opportunityId: string; opportunityTitle: string }
): Promise<ToolResult> {
  try {
    const supabase = await createClient()
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }

    // Check if opportunity exists
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('id, title')
      .eq('id', params.opportunityId)
      .single()

    if (oppError || !opportunity) {
      return { success: false, error: 'Opportunity not found' }
    }

    // Upsert the bookmark
    const { error: upsertError } = await supabase
      .from('user_opportunities')
      .upsert({
        user_id: userId,
        opportunity_id: params.opportunityId,
        status: 'saved',
        match_score: 0,
        match_reasons: [],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,opportunity_id'
      })

    if (upsertError) {
      console.error('[bookmarkOpportunity]', upsertError)
      return { success: false, error: 'Failed to bookmark opportunity' }
    }

    return {
      success: true,
      data: {
        bookmarked: true,
        title: opportunity.title
      }
    }
  } catch (error) {
    console.error('[bookmarkOpportunity]', error)
    return { success: false, error: 'Failed to bookmark opportunity' }
  }
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  userId: string,
  params: Record<string, unknown> = {}
): Promise<ToolResult> {
  switch (toolName) {
    case 'get_user_profile':
      return getUserProfile(userId)
    
    case 'get_extracurriculars':
      return getExtracurriculars(userId)
    
    case 'get_saved_opportunities':
      return getSavedOpportunities(userId)
    
    case 'get_projects':
      return getProjects(userId)
    
    case 'get_goals':
      return getGoals(userId)
    
    case 'search_opportunities':
      return searchOpportunities(userId, params as { query: string; category?: string; type?: string; limit?: number })
    
    case 'smart_search_opportunities':
      return smartSearchOpportunities(userId, params as { query?: string; category?: string; type?: string; limit?: number })
    
    case 'filter_by_deadline':
      return filterByDeadline(userId, params as { days: number; category?: string; type?: string; limit?: number })
    
    case 'bookmark_opportunity':
      return bookmarkOpportunity(userId, params as { opportunityId: string; opportunityTitle: string })
    
    case 'trigger_web_discovery':
      // This is handled specially in the chat route - returns a flag
      return {
        success: true,
        data: {
          triggerDiscovery: true,
          query: params.query as string
        }
      }
    
    case 'personalized_web_discovery':
      return personalizedWebDiscovery(userId, params as { topic?: string; category?: string })
    
    default:
      return { success: false, error: `Unknown tool: ${toolName}` }
  }
}
