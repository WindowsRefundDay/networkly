import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const supabase = await createClient()
    const { data: opportunity, error } = await supabase
      .from('opportunities')
      .select('id, title, company, location, type, category, deadline, description, skills, url, source_url, remote, salary, duration, requirements, is_active, is_expired')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error || !opportunity) {
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

    // Transform to InlineOpportunity format (map snake_case to camelCase)
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
      url: opportunity.url || opportunity.source_url || null,
      urgency,
      daysUntilDeadline,
      remote: opportunity.remote,
      salary: opportunity.salary,
      duration: opportunity.duration,
      requirements: opportunity.requirements,
      isActive: opportunity.is_active,
      isExpired: opportunity.is_expired,
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
