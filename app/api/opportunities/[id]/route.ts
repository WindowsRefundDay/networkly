import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/opportunities/[id]
 * 
 * Fetches a single opportunity by ID.
 * Used by the chat interface to render inline opportunity cards.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Opportunity ID is required' },
        { status: 400 }
      )
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        type: true,
        category: true,
        deadline: true,
        description: true,
        skills: true,
        url: true,
        sourceUrl: true,
        remote: true,
        salary: true,
        duration: true,
        requirements: true,
        isActive: true,
        isExpired: true,
      },
    })

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    // Calculate urgency based on deadline
    let urgency: 'urgent' | 'soon' | 'upcoming' | null = null
    let daysUntilDeadline: number | null = null

    if (opportunity.deadline) {
      const now = new Date()
      const deadline = new Date(opportunity.deadline)
      const diffTime = deadline.getTime() - now.getTime()
      daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (daysUntilDeadline <= 3) {
        urgency = 'urgent'
      } else if (daysUntilDeadline <= 7) {
        urgency = 'soon'
      } else {
        urgency = 'upcoming'
      }
    }

    // Transform to InlineOpportunity format
    const response = {
      id: opportunity.id,
      title: opportunity.title,
      organization: opportunity.company,
      location: opportunity.location,
      type: opportunity.type,
      category: opportunity.category,
      deadline: opportunity.deadline
        ? new Date(opportunity.deadline).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : null,
      description: opportunity.description,
      skills: opportunity.skills,
      url: opportunity.url || opportunity.sourceUrl || null,
      urgency,
      daysUntilDeadline,
      remote: opportunity.remote,
      salary: opportunity.salary,
      duration: opportunity.duration,
      requirements: opportunity.requirements,
      isActive: opportunity.isActive,
      isExpired: opportunity.isExpired,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Opportunities API Error]', error)
    return NextResponse.json(
      { error: 'Failed to fetch opportunity' },
      { status: 500 }
    )
  }
}
