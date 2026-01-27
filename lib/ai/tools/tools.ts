/**
 * AI Tools - Unified Tool Definitions with AI SDK v5+ Pattern
 * 
 * Uses tool() wrapper with inputSchema for Vertex AI/Gemini compatibility.
 * Context (userId, supabaseClient) passed via experimental_context.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

// =============================================================================
// Types
// =============================================================================

export interface ToolContext {
  userId: string
  supabaseClient?: SupabaseClient<Database>
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

type ExtracurricularRow = Database['public']['Tables']['extracurriculars']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type GoalRow = Database['public']['Tables']['user_goals']['Row']
type OpportunityRow = Database['public']['Tables']['opportunities']['Row']
type UserOpportunityRow = Database['public']['Tables']['user_opportunities']['Row']
type SavedOpportunityJoin = UserOpportunityRow & { opportunities: OpportunityRow }

// Shared schema for no-arg functions to ensure Vertex AI compatibility
// Vertex AI requires at least one property in the schema for function declarations
const NoArgSchema = z.object({
  _context: z.string().optional().describe('Context for the tool call (unused)')
})

// =============================================================================
// Profile & Data Access Tools
// =============================================================================

/**
 * Get user profile with skills, interests, and goals
 */
export const get_user_profile = tool({
  description: 'Get the current user\'s profile including name, skills, interests, and career goals. Use this to personalize advice.',
  inputSchema: NoArgSchema,
  execute: async (_input, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext
      const supabase = (context.supabaseClient || await createClient()) as SupabaseClient<Database>
      
      // Get user and profile data in parallel
      const [
        { data: user, error: userError },
        { data: userProfile }
      ] = await Promise.all([
        supabase
          .from('users')
          .select('id, name, headline, bio, location, skills, interests, university, graduation_year')
          .eq('id', context.userId)
          .single(),
        supabase
          .from('user_profiles')
          .select('career_goals, grade_level, preferred_opportunity_types, academic_strengths')
          .eq('user_id', context.userId)
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
})

/**
 * Get user's extracurricular activities
 */
export const get_extracurriculars = tool({
  description: 'Get the user\'s extracurricular activities and experiences.',
  inputSchema: NoArgSchema,
  execute: async (_input, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext
      const supabase = await createClient()
      
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', context.userId)
        .single()

      if (userError || !user) {
        return { success: false, error: 'User not found' }
      }

      // Get extracurriculars
      const { data: ecs, error: ecsError } = await supabase
        .from('extracurriculars')
        .select('id, title, organization, type, start_date, end_date, description')
        .eq('user_id', context.userId)
        .order('start_date', { ascending: false })

      if (ecsError) {
        return { success: false, error: 'Failed to get activities' }
      }

      return {
        success: true,
        data: {
          count: ecs?.length || 0,
          activities: ((ecs || []) as ExtracurricularRow[]).map(ec => ({
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
})

/**
 * Get user's saved/bookmarked opportunities
 */
export const get_saved_opportunities = tool({
  description: 'Get opportunities the user has bookmarked/saved.',
  inputSchema: NoArgSchema,
  execute: async (_input, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext
      const supabase = await createClient()
      
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', context.userId)
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
        .eq('user_id', context.userId)
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
          opportunities: ((saved || []) as SavedOpportunityJoin[]).map(s => {
            const opp = s.opportunities
            return {
              id: opp.id,
              title: opp.title,
              organization: opp.company,
              location: opp.location_type === 'Online' ? 'Remote' : opp.location,
              type: opp.type,
              category: opp.category,
              deadline: opp.deadline ? new Date(opp.deadline as string).toLocaleDateString() : null,
            }
          })
        }
      }
    } catch (error) {
      return { success: false, error: 'Failed to get saved opportunities' }
    }
  }
})

/**
 * Get user's projects
 */
export const get_projects = tool({
  description: 'Get the user\'s projects.',
  inputSchema: NoArgSchema,
  execute: async (_input, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext
      const supabase = await createClient()
      
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', context.userId)
        .single()

      if (userError || !user) {
        return { success: false, error: 'User not found' }
      }

      // Get projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, title, description, status, category, tags, progress')
        .eq('owner_id', context.userId)
        .order('updated_at', { ascending: false })
        .limit(10)

      if (projectsError) {
        return { success: false, error: 'Failed to get projects' }
      }

      return {
        success: true,
        data: {
          count: projects?.length || 0,
          projects: ((projects || []) as ProjectRow[]).map(p => ({
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
})

/**
 * Get user's goals
 */
export const get_goals = tool({
  description: 'Get the user\'s career goals and roadmaps.',
  inputSchema: NoArgSchema,
  execute: async (_input, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext
      const supabase = await createClient()
      
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', context.userId)
        .single()

      if (userError || !user) {
        return { success: false, error: 'User not found' }
      }

      // Get goals
      const { data: goals, error: goalsError } = await supabase
        .from('user_goals')
        .select('id, goal_text, roadmap')
        .eq('user_id', context.userId)
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
          goals: ((goals || []) as GoalRow[]).map(g => ({
            goal: g.goal_text,
            roadmap: g.roadmap,
          }))
        }
      }
    } catch (error) {
      return { success: false, error: 'Failed to get goals' }
    }
  }
})

// =============================================================================
// Opportunity Search Tools
// =============================================================================

/**
 * Search for opportunities in database
 */
export const search_opportunities = tool({
  description: 'SECONDARY search tool. Only use this if smart_search_opportunities fails or for very simple keyword lookups.',
  inputSchema: z.object({
    query: z.string().describe('Search query (e.g., "robotics", "STEM internship")'),
    category: z.enum(['STEM', 'Arts', 'Business', 'Community Service', 'Sports', 'Other']).optional().describe('Category filter'),
    type: z.enum(['Internship', 'Competition', 'Summer Program', 'Research', 'Volunteer', 'Scholarship']).optional().describe('Type filter'),
    limit: z.number().optional().describe('Maximum results (default 5)')
  }),
  execute: async (input, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext
      const supabase = await createClient()
      const { query, category, type, limit = 5 } = input

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
        console.error('[search_opportunities]', error)
        return { success: false, error: 'Failed to search opportunities' }
      }

      return {
        success: true,
        data: {
          count: opportunities?.length || 0,
          query: query,
          opportunities: ((opportunities || []) as OpportunityRow[]).map(o => ({
            id: o.id,
            title: o.title,
            organization: o.company,
            location: o.location_type === 'Online' ? 'Remote' : o.location,
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
      console.error('[search_opportunities]', error)
      return { success: false, error: 'Failed to search opportunities' }
    }
  }
})

/**
 * Smart search - Profile-aware opportunity search
 * Automatically fetches user profile and filters/ranks by relevance
 */
export const smart_search_opportunities = tool({
  description: 'PRIMARY & PREFERRED search tool. Use this for all internship, job, and program searches. It automatically personalizes results based on the user profile.',
  inputSchema: z.object({
    query: z.string().optional().describe('Short, broad keywords (e.g., "robotics", "medicine"). Avoid long sentences.'),
    category: z.enum(['STEM', 'Arts', 'Business', 'Community Service', 'Sports', 'Other']).optional().describe('Category filter'),
    type: z.enum(['Internship', 'Competition', 'Summer Program', 'Research', 'Volunteer', 'Scholarship']).optional().describe('Type filter'),
    limit: z.number().optional().describe('Maximum results')
  }),
  execute: async (input, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext
      const supabase = (context.supabaseClient || await createClient()) as SupabaseClient<Database>
      const { query = '', category, type, limit = 10 } = input

      // Get user and profile data in parallel for personalization
      const [
        { data: user, error: userError },
        { data: userProfile }
      ] = await Promise.all([
        supabase
          .from('users')
          .select('id, location, skills, interests')
          .eq('id', context.userId)
          .single(),
        supabase
          .from('user_profiles')
          .select('grade_level, preferred_opportunity_types, academic_strengths')
          .eq('user_id', context.userId)
          .single()
      ])

      if (userError || !user) {
        return { success: false, error: 'User not found' }
      }

      // Build search terms from query + user profile
      const userInterests = (user.interests || []) as string[]
      const userSkills = (user.skills || []) as string[]
      const preferredTypes = (userProfile?.preferred_opportunity_types || []) as string[]
      const academicStrengths = (userProfile?.academic_strengths || []) as string[]
      
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
        console.error('[smart_search_opportunities]', error)
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
      console.error('[smart_search_opportunities]', error)
      return { success: false, error: 'Failed to search opportunities' }
    }
  }
})

/**
 * Filter opportunities by deadline within X days
 */
export const filter_by_deadline = tool({
  description: 'Find opportunities with deadlines within a specific timeframe.',
  inputSchema: z.object({
    days: z.number().describe('Number of days from now to search within'),
    category: z.string().optional().describe('Category filter'),
    type: z.string().optional().describe('Type filter'),
    limit: z.number().optional().describe('Maximum results limit')
  }),
  execute: async (input, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext
      const supabase = await createClient()
      const { days, category, type, limit = 10 } = input

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
        console.error('[filter_by_deadline]', error)
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
      console.error('[filter_by_deadline]', error)
      return { success: false, error: 'Failed to filter by deadline' }
    }
  }
})

// =============================================================================
// Action Tools
// =============================================================================

/**
 * Bookmark an opportunity for the user
 */
export const bookmark_opportunity = tool({
  description: 'Save an opportunity to the user\'s bookmarks. Only call after user confirmation.',
  inputSchema: z.object({
    opportunityId: z.string().describe('ID of the opportunity'),
    opportunityTitle: z.string().describe('Title of the opportunity')
  }),
  execute: async (input, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext
      const supabase = await createClient()
      
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', context.userId)
        .single()

      if (userError || !user) {
        return { success: false, error: 'User not found' }
      }

      // Check if opportunity exists
      const { data: opportunity, error: oppError } = await supabase
        .from('opportunities')
        .select('id, title')
        .eq('id', input.opportunityId)
        .single()

      if (oppError || !opportunity) {
        return { success: false, error: 'Opportunity not found' }
      }

      // Upsert the bookmark
      const { error: upsertError } = await supabase
        .from('user_opportunities')
        .upsert({
          user_id: context.userId,
          opportunity_id: input.opportunityId,
          status: 'saved',
          match_score: 0,
          match_reasons: [],
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,opportunity_id'
        })

      if (upsertError) {
        console.error('[bookmark_opportunity]', upsertError)
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
      console.error('[bookmark_opportunity]', error)
      return { success: false, error: 'Failed to bookmark opportunity' }
    }
  }
})

// =============================================================================
// Web Discovery Tools
// =============================================================================

/**
 * Trigger basic web discovery
 */
export const trigger_web_discovery = tool({
  description: 'Trigger basic web discovery. Only call after user agreement.',
  inputSchema: z.object({
    query: z.string().describe('Search query')
  }),
  execute: async (input) => {
    // This returns a flag for the chat route to handle
    return {
      success: true,
      data: {
        triggerDiscovery: true,
        query: input.query
      }
    }
  }
})

/**
 * Personalized web discovery - builds smart queries from user profile
 * Returns a flag to trigger the discovery stream with profile-enhanced query
 */
export const personalized_web_discovery = tool({
  description: 'Trigger personalized web discovery based on profile. Preferred over basic discovery. Only call after agreement.',
  inputSchema: z.object({
    topic: z.string().optional().describe('Optional topic/focus'),
    category: z.enum(['STEM', 'Arts', 'Business', 'Community Service', 'Sports']).optional().describe('Optional category')
  }),
  execute: async (input, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext
      const supabase = (context.supabaseClient || await createClient()) as SupabaseClient<Database>
      const { topic, category } = input

      // Get user and profile data in parallel for building personalized query
      const [
        { data: user, error: userError },
        { data: userProfile }
      ] = await Promise.all([
        supabase
          .from('users')
          .select('location, interests, skills')
          .eq('id', context.userId)
          .single(),
        supabase
          .from('user_profiles')
          .select('grade_level, preferred_opportunity_types, academic_strengths')
          .eq('user_id', context.userId)
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
      const interests = (user.interests || []) as string[]
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
      const preferredTypes = (userProfile?.preferred_opportunity_types || []) as string[]
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
      console.error('[personalized_web_discovery]', error)
      return { success: false, error: 'Failed to prepare personalized discovery' }
    }
  }
})

// =============================================================================
// Exports
// =============================================================================

/**
 * All tools combined for easy passing to streamText/generateText
 */
export const TOOLS = {
  get_user_profile,
  get_extracurriculars,
  get_saved_opportunities,
  get_projects,
  get_goals,
  search_opportunities,
  smart_search_opportunities,
  filter_by_deadline,
  bookmark_opportunity,
  trigger_web_discovery,
  personalized_web_discovery,
}

/**
 * List of tool names for UI display
 */
export const TOOL_NAMES = Object.keys(TOOLS)
