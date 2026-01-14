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

// Get user's database ID from Clerk ID
async function getUserDbId(clerkId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true }
  })
  return user?.id || null
}

/**
 * Get user profile with skills, interests, and goals
 */
export async function getUserProfile(clerkId: string): Promise<ToolResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
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
export async function getExtracurriculars(clerkId: string): Promise<ToolResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
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
export async function getSavedOpportunities(clerkId: string): Promise<ToolResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
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
export async function getProjects(clerkId: string): Promise<ToolResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
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
export async function getGoals(clerkId: string): Promise<ToolResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
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
  clerkId: string,
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
        }))
      }
    }
  } catch (error) {
    console.error('[searchOpportunities]', error)
    return { success: false, error: 'Failed to search opportunities' }
  }
}

/**
 * Bookmark an opportunity for the user
 */
export async function bookmarkOpportunity(
  clerkId: string,
  params: { opportunityId: string; opportunityTitle: string }
): Promise<ToolResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
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
  clerkId: string,
  params: Record<string, unknown> = {}
): Promise<ToolResult> {
  switch (toolName) {
    case 'get_user_profile':
      return getUserProfile(clerkId)
    
    case 'get_extracurriculars':
      return getExtracurriculars(clerkId)
    
    case 'get_saved_opportunities':
      return getSavedOpportunities(clerkId)
    
    case 'get_projects':
      return getProjects(clerkId)
    
    case 'get_goals':
      return getGoals(clerkId)
    
    case 'search_opportunities':
      return searchOpportunities(clerkId, params as { query: string; category?: string; type?: string; limit?: number })
    
    case 'bookmark_opportunity':
      return bookmarkOpportunity(clerkId, params as { opportunityId: string; opportunityTitle: string })
    
    case 'trigger_web_discovery':
      // This is handled specially in the chat route - returns a flag
      return {
        success: true,
        data: {
          triggerDiscovery: true,
          query: params.query as string
        }
      }
    
    default:
      return { success: false, error: `Unknown tool: ${toolName}` }
  }
}
