'use client'

/**
 * OpportunityCardInline - Enhanced opportunity card for chat interface
 * 
 * Features:
 * - Apply Now, Bookmark, Details buttons
 * - Urgency badges for approaching deadlines
 * - Match reasons display showing why this opportunity fits the user
 */

import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Building2, Bookmark, ExternalLink, Clock, CheckCircle2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface InlineOpportunity {
  id: string
  title: string
  organization: string
  location: string
  type: string
  category?: string
  deadline: string | null
  description?: string
  skills?: string[]
  // Enhanced fields for smart cards
  url?: string | null              // For "Apply Now" button
  matchReasons?: string[]          // Why this matches user profile
  matchScore?: number              // 0-100 relevance score
  urgency?: 'urgent' | 'soon' | 'upcoming' | null  // Deadline urgency
  daysUntilDeadline?: number | null
}

interface OpportunityCardInlineProps {
  opportunity: InlineOpportunity
  onBookmark?: (id: string, title: string) => void
  isBookmarking?: boolean
  isBookmarked?: boolean
  className?: string
}

// Urgency badge component
function UrgencyBadge({ urgency, daysLeft }: { urgency: 'urgent' | 'soon' | 'upcoming'; daysLeft?: number | null }) {
  const config = {
    urgent: {
      className: 'bg-red-500/15 text-red-600 border-red-500/30',
      icon: Clock,
      label: daysLeft !== null && daysLeft !== undefined ? `${daysLeft} days left` : 'Due soon',
    },
    soon: {
      className: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
      icon: Clock,
      label: daysLeft !== null && daysLeft !== undefined ? `${daysLeft} days left` : 'Coming up',
    },
    upcoming: {
      className: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
      icon: Calendar,
      label: 'Upcoming',
    },
  }

  const { className, icon: Icon, label } = config[urgency]

  return (
    <span className={cn('flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

export function OpportunityCardInline({
  opportunity,
  onBookmark,
  isBookmarking,
  isBookmarked,
  className,
}: OpportunityCardInlineProps) {
  const router = useRouter()

  const handleApply = () => {
    if (opportunity.url) {
      window.open(opportunity.url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleDetails = () => {
    router.push(`/opportunities?highlight=${opportunity.id}`)
  }

  const handleBookmark = () => {
    onBookmark?.(opportunity.id, opportunity.title)
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-all shadow-sm hover:shadow-md',
        className
      )}
    >
      {/* Header with title, org, and type badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm text-foreground leading-tight">
            {opportunity.title}
          </h4>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{opportunity.organization}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {opportunity.type && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
              {opportunity.type}
            </span>
          )}
          {opportunity.urgency && (
            <UrgencyBadge urgency={opportunity.urgency} daysLeft={opportunity.daysUntilDeadline} />
          )}
        </div>
      </div>

      {/* Meta info: location and deadline */}
      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 shrink-0">
          <MapPin className="h-3.5 w-3.5 text-primary/60" />
          <span className="font-medium">{opportunity.location}</span>
        </div>
        {opportunity.deadline && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar className="h-3.5 w-3.5 text-primary/60" />
            <span className="font-medium text-destructive">Due: {opportunity.deadline}</span>
          </div>
        )}
      </div>

      {/* Description preview */}
      {opportunity.description && (
        <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {opportunity.description}
        </p>
      )}

      {/* Match Reasons - why this opportunity fits the user */}
      {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
        <div className="mt-3 p-2.5 rounded-lg bg-green-500/5 border border-green-500/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wide">
              Why it matches you
            </span>
            {opportunity.matchScore !== undefined && opportunity.matchScore > 0 && (
              <span className="ml-auto text-[10px] font-medium text-green-600">
                {opportunity.matchScore}% match
              </span>
            )}
          </div>
          <ul className="space-y-0.5">
            {opportunity.matchReasons.slice(0, 3).map((reason, i) => (
              <li key={i} className="text-[11px] text-green-700 flex items-start gap-1.5">
                <span className="text-green-500 mt-0.5">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skills tags */}
      {opportunity.skills && opportunity.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {opportunity.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 text-[10px] rounded-full bg-secondary text-secondary-foreground"
            >
              {skill}
            </span>
          ))}
          {opportunity.skills.length > 4 && (
            <span className="text-[10px] text-muted-foreground px-1">
              +{opportunity.skills.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Action Buttons: Apply Now | Bookmark | Details */}
      <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-3 border-t border-border/40">
        {/* Details - navigate to opportunity page */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs px-3 hover:bg-muted/50 transition-colors"
          onClick={handleDetails}
        >
          Details
        </Button>

        {/* Bookmark */}
        {onBookmark && (
          <Button
            variant={isBookmarked ? 'secondary' : 'outline'}
            size="sm"
            className={cn(
              'h-8 text-xs px-3 whitespace-nowrap',
              isBookmarked && 'bg-amber-500/10 text-amber-600 border-amber-500/30'
            )}
            onClick={handleBookmark}
            disabled={isBookmarking}
          >
            <Bookmark className={cn('h-3.5 w-3.5 mr-1.5', isBookmarked && 'fill-current')} />
            {isBookmarking ? 'Saving...' : isBookmarked ? 'Saved' : 'Bookmark'}
          </Button>
        )}

        {/* Apply Now - only if URL exists */}
        {opportunity.url && (
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs px-3 bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20 whitespace-nowrap"
            onClick={handleApply}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Apply Now
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Grid of opportunity cards for chat - renders multiple cards
 */
interface OpportunityGridProps {
  opportunities: InlineOpportunity[]
  onBookmark?: (id: string, title: string) => void
  bookmarkingId?: string
  bookmarkedIds?: Set<string>
}

export function OpportunityGrid({
  opportunities,
  onBookmark,
  bookmarkingId,
  bookmarkedIds,
}: OpportunityGridProps) {
  if (opportunities.length === 0) return null

  return (
    <div className="grid gap-3 mt-3">
      {opportunities.map((opp) => (
        <OpportunityCardInline
          key={opp.id}
          opportunity={opp}
          onBookmark={onBookmark}
          isBookmarking={bookmarkingId === opp.id}
          isBookmarked={bookmarkedIds?.has(opp.id)}
        />
      ))}
    </div>
  )
}
