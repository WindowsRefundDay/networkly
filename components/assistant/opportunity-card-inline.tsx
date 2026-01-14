'use client'

/**
 * OpportunityCardInline - Compact opportunity card for chat interface
 */

import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Building2, Bookmark, ExternalLink } from 'lucide-react'

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
}

interface OpportunityCardInlineProps {
  opportunity: InlineOpportunity
  onBookmark?: (id: string, title: string) => void
  isBookmarking?: boolean
  className?: string
}

export function OpportunityCardInline({
  opportunity,
  onBookmark,
  isBookmarking,
  className,
}: OpportunityCardInlineProps) {
  const router = useRouter()

  const handleView = () => {
    router.push(`/opportunities?highlight=${opportunity.id}`)
  }

  const handleBookmark = () => {
    onBookmark?.(opportunity.id, opportunity.title)
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-sm text-foreground truncate">
            {opportunity.title}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{opportunity.organization}</span>
          </div>
        </div>
        {opportunity.type && (
          <span className="shrink-0 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
            {opportunity.type}
          </span>
        )}
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span>{opportunity.location}</span>
        </div>
        {opportunity.deadline && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Due: {opportunity.deadline}</span>
          </div>
        )}
      </div>

      {/* Description preview */}
      {opportunity.description && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
          {opportunity.description}
        </p>
      )}

      {/* Skills */}
      {opportunity.skills && opportunity.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {opportunity.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="px-1.5 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground"
            >
              {skill}
            </span>
          ))}
          {opportunity.skills.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{opportunity.skills.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-3">
        {onBookmark && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleBookmark}
            disabled={isBookmarking}
          >
            <Bookmark className="h-3 w-3 mr-1" />
            {isBookmarking ? 'Saving...' : 'Bookmark'}
          </Button>
        )}
        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs"
          onClick={handleView}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View
        </Button>
      </div>
    </div>
  )
}

/**
 * Grid of opportunity cards for chat
 */
interface OpportunityGridProps {
  opportunities: InlineOpportunity[]
  onBookmark?: (id: string, title: string) => void
  bookmarkingId?: string
}

export function OpportunityGrid({
  opportunities,
  onBookmark,
  bookmarkingId,
}: OpportunityGridProps) {
  if (opportunities.length === 0) return null

  return (
    <div className="grid gap-2 mt-2">
      {opportunities.map((opp) => (
        <OpportunityCardInline
          key={opp.id}
          opportunity={opp}
          onBookmark={onBookmark}
          isBookmarking={bookmarkingId === opp.id}
        />
      ))}
    </div>
  )
}
