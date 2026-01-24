/**
 * AI Tool Executors - Execute tool calls and return results
 * 
 * All database operations are performed here.
 * Results are formatted for the AI to interpret and respond naturally.
 */

import { prisma } from '@/lib/prisma'

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

/**
 * Get user profile with skills, interests, and goals
 */
export async function getUserProfile(userId: string): Promise<ToolResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        headline: true,
        bio: true,
        location: true,
        skills: true,
        interests: true,
        university: true,
        graduationYear: true,
        userProfile: {
          select: {
            career_goals: true,
            grade_level: true,
            preferred_opportunity_types: true,
            academic_strengths: true,
          }
        }
      }
    })

    if (!user) {
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
        graduationYear: user.graduationYear,
        careerGoals: user.userProfile?.career_goals,
        gradeLevel: user.userProfile?.grade_level,
        preferredTypes: user.userProfile?.preferred_opportunity_types,
        academicStrengths: user.userProfile?.academic_strengths,
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const ecs = await prisma.extracurricular.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        title: true,
        organization: true,
        type: true,
        startDate: true,
        endDate: true,
        description: true,
      },
      orderBy: { startDate: 'desc' }
    })

    return {
      success: true,
      data: {
        count: ecs.length,
        activities: ecs.map(ec => ({
          title: ec.title,
          organization: ec.organization,
          type: ec.type,
          period: `${ec.startDate} - ${ec.endDate}`,
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const saved = await prisma.userOpportunity.findMany({
      where: {
        userId: user.id,
        status: 'saved'
      },
      include: {
        opportunity: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            type: true,
            category: true,
            deadline: true,
            remote: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return {
      success: true,
      data: {
        count: saved.length,
        opportunities: saved.map(s => ({
          id: s.opportunity.id,
          title: s.opportunity.title,
          organization: s.opportunity.company,
          location: s.opportunity.remote ? 'Remote' : s.opportunity.location,
          type: s.opportunity.type,
          category: s.opportunity.category,
          deadline: s.opportunity.deadline?.toLocaleDateString() || null,
        }))
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const projects = await prisma.project.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        category: true,
        tags: true,
        progress: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    })

    return {
      success: true,
      data: {
        count: projects.length,
        projects: projects.map(p => ({
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const goals = await prisma.userGoal.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      select: {
        id: true,
        goalText: true,
        roadmap: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    return {
      success: true,
      data: {
        count: goals.length,
        goals: goals.map(g => ({
          goal: g.goalText,
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
    const { query, category, type, limit = 5 } = params
    const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2)

    const opportunities = await prisma.opportunity.findMany({
      where: {
        isActive: true,
        AND: [
          // Category filter
          category ? { category: { contains: category, mode: 'insensitive' } } : {},
          // Type filter
          type ? { type: { contains: type, mode: 'insensitive' } } : {},
          // Search in title, description, company, skills
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { company: { contains: query, mode: 'insensitive' } },
              { category: { contains: query, mode: 'insensitive' } },
              // Check if any search term matches
              ...searchTerms.map(term => ({
                OR: [
                  { title: { contains: term, mode: 'insensitive' as const } },
                  { description: { contains: term, mode: 'insensitive' as const } },
                  { skills: { hasSome: [term] } },
                ]
              }))
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        type: true,
        category: true,
        deadline: true,
        remote: true,
        description: true,
        skills: true,
        url: true,
        sourceUrl: true,
      },
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' }
      ],
      take: limit
    })

    return {
      success: true,
      data: {
        count: opportunities.length,
        query: query,
        opportunities: opportunities.map(o => ({
          id: o.id,
          title: o.title,
          organization: o.company,
          location: o.remote ? 'Remote' : o.location,
          type: o.type,
          category: o.category,
          deadline: o.deadline?.toLocaleDateString() || null,
          description: o.description?.slice(0, 150) + (o.description && o.description.length > 150 ? '...' : ''),
          skills: o.skills.slice(0, 5),
          url: o.url || o.sourceUrl || null,
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
  params: { query?: string; category?: string; type?: string; limit?: number }
): Promise<ToolResult> {
  try {
    const { query = '', category, type, limit = 10 } = params

    // First, get user profile for personalization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        location: true,
        skills: true,
        interests: true,
        userProfile: {
          select: {
            grade_level: true,
            preferred_opportunity_types: true,
            academic_strengths: true,
          }
        }
      }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Build search terms from query + user profile
    const userInterests = user.interests || []
    const userSkills = user.skills || []
    const preferredTypes = user.userProfile?.preferred_opportunity_types || []
    const academicStrengths = user.userProfile?.academic_strengths || []
    
    // Combine all terms for matching
    const allTerms = [
      ...query.toLowerCase().split(' ').filter(t => t.length > 2),
      ...userInterests.map(i => i.toLowerCase()),
      ...userSkills.map(s => s.toLowerCase()),
      ...academicStrengths.map(s => s.toLowerCase()),
    ].slice(0, 20) // Limit to prevent huge queries

    // Build where clause
    const whereClause: Record<string, unknown> = {
      isActive: true,
    }

    const andConditions: Record<string, unknown>[] = []

    // Category filter
    if (category) {
      andConditions.push({ category: { contains: category, mode: 'insensitive' } })
    }

    // Type filter - from param or user preferences
    if (type) {
      andConditions.push({ type: { contains: type, mode: 'insensitive' } })
    } else if (preferredTypes.length > 0) {
      andConditions.push({
        OR: preferredTypes.map(t => ({ type: { contains: t, mode: 'insensitive' } }))
      })
    }

    // Search by terms (query + profile interests/skills)
    if (allTerms.length > 0) {
      andConditions.push({
        OR: [
          ...allTerms.slice(0, 10).map(term => ({
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } },
              { company: { contains: term, mode: 'insensitive' } },
              { category: { contains: term, mode: 'insensitive' } },
              { skills: { hasSome: [term] } },
            ]
          }))
        ]
      })
    }

    if (andConditions.length > 0) {
      whereClause.AND = andConditions
    }

    // Fetch opportunities
    const opportunities = await prisma.opportunity.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        type: true,
        category: true,
        deadline: true,
        remote: true,
        description: true,
        skills: true,
        url: true,
        sourceUrl: true,
      },
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' }
      ],
      take: limit * 2 // Fetch extra for ranking
    })

    // Score and rank opportunities by profile match
    const scoredOpportunities = opportunities.map(opp => {
      let score = 0
      const matchReasons: string[] = []

      // Check skill matches
      const oppSkillsLower = opp.skills.map(s => s.toLowerCase())
      const skillMatches = userSkills.filter(s => 
        oppSkillsLower.some(os => os.includes(s.toLowerCase()) || s.toLowerCase().includes(os))
      )
      if (skillMatches.length > 0) {
        score += skillMatches.length * 10
        matchReasons.push(`Matches your skills: ${skillMatches.slice(0, 2).join(', ')}`)
      }

      // Check interest matches
      const titleLower = opp.title.toLowerCase()
      const descLower = (opp.description || '').toLowerCase()
      const interestMatches = userInterests.filter(i => 
        titleLower.includes(i.toLowerCase()) || descLower.includes(i.toLowerCase())
      )
      if (interestMatches.length > 0) {
        score += interestMatches.length * 8
        matchReasons.push(`Matches your interest in ${interestMatches[0]}`)
      }

      // Location match
      if (opp.remote) {
        score += 5
        matchReasons.push('Remote-friendly')
      } else if (user.location && opp.location?.toLowerCase().includes(user.location.toLowerCase())) {
        score += 7
        matchReasons.push(`Near ${user.location}`)
      }

      // Deadline urgency bonus (sooner = higher priority)
      if (opp.deadline) {
        const daysUntil = Math.ceil((opp.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
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
          location: o.remote ? 'Remote' : o.location,
          type: o.type,
          category: o.category,
          deadline: o.deadline?.toLocaleDateString() || null,
          description: o.description?.slice(0, 150) + (o.description && o.description.length > 150 ? '...' : ''),
          skills: o.skills.slice(0, 5),
          url: o.url || o.sourceUrl || null,
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
    const { days, category, type, limit = 10 } = params

    const now = new Date()
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    const whereClause: Record<string, unknown> = {
      isActive: true,
      deadline: {
        gte: now,
        lte: futureDate,
      }
    }

    if (category) {
      whereClause.category = { contains: category, mode: 'insensitive' }
    }
    if (type) {
      whereClause.type = { contains: type, mode: 'insensitive' }
    }

    const opportunities = await prisma.opportunity.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        type: true,
        category: true,
        deadline: true,
        remote: true,
        description: true,
        skills: true,
        url: true,
        sourceUrl: true,
      },
      orderBy: { deadline: 'asc' },
      take: limit
    })

    return {
      success: true,
      data: {
        count: opportunities.length,
        timeframe: `next ${days} days`,
        opportunities: opportunities.map(o => {
          const daysUntil = o.deadline 
            ? Math.ceil((o.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null

          return {
            id: o.id,
            title: o.title,
            organization: o.company,
            location: o.remote ? 'Remote' : o.location,
            type: o.type,
            category: o.category,
            deadline: o.deadline?.toLocaleDateString() || null,
            daysUntilDeadline: daysUntil,
            urgency: daysUntil !== null && daysUntil <= 3 ? 'urgent' : daysUntil !== null && daysUntil <= 7 ? 'soon' : 'upcoming',
            description: o.description?.slice(0, 150) + (o.description && o.description.length > 150 ? '...' : ''),
            skills: o.skills.slice(0, 5),
            url: o.url || o.sourceUrl || null,
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
  params: { topic?: string; category?: string }
): Promise<ToolResult> {
  try {
    const { topic, category } = params

    // Get user profile for building personalized query
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        location: true,
        interests: true,
        skills: true,
        userProfile: {
          select: {
            grade_level: true,
            preferred_opportunity_types: true,
            academic_strengths: true,
          }
        }
      }
    })

    if (!user) {
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
    const gradeLevel = user.userProfile?.grade_level
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
    const preferredTypes = user.userProfile?.preferred_opportunity_types || []
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Check if opportunity exists
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: params.opportunityId },
      select: { id: true, title: true }
    })

    if (!opportunity) {
      return { success: false, error: 'Opportunity not found' }
    }

    // Upsert the bookmark
    await prisma.userOpportunity.upsert({
      where: {
        userId_opportunityId: {
          userId: user.id,
          opportunityId: params.opportunityId
        }
      },
      update: {
        status: 'saved',
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        opportunityId: params.opportunityId,
        status: 'saved',
        matchScore: 0,
        matchReasons: []
      }
    })

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
