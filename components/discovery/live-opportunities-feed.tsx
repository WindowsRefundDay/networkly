'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import { List, type RowComponentProps } from 'react-window'
import { Building2, Calendar, ExternalLink, MapPin, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PerformanceErrorBoundary } from '@/components/ui/performance-error-boundary'
import { cn } from '@/lib/utils'

interface Opportunity {
  id: string
  title: string
  organization?: string
  category: string
  type: string
  url: string
  deadline?: string
  summary: string
  location_type: string
  confidence: number
}

interface LiveOpportunitiesFeedProps {
  opportunities: Opportunity[]
  className?: string
}

interface OpportunityRowProps {
  opportunities: Opportunity[]
}

const CATEGORY_COLORS: Record<string, string> = {
  STEM: 'bg-primary/10 text-primary',
  Arts: 'bg-secondary/20 text-foreground',
  Business: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Leadership: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  'Community Service': 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
  Sports: 'bg-red-500/10 text-red-700 dark:text-red-400',
  Humanities: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
}

const TYPE_COLORS: Record<string, string> = {
  Competition: 'border-primary/30 text-primary',
  Internship: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  'Summer Program': 'border-amber-500/30 text-amber-700 dark:text-amber-400',
  Scholarship: 'border-secondary/40 text-foreground',
  Research: 'border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
}

const ROW_HEIGHT = 248
const FEED_MAX_HEIGHT = 600

const OpportunityRow = memo(function OpportunityRow({
  index,
  style,
  ariaAttributes,
  opportunities,
}: RowComponentProps<OpportunityRowProps>) {
  const opp = opportunities[index]
  const isNewest = index === 0

  return (
    <div style={style} {...ariaAttributes} className="pr-2 pb-3">
      <Card className={cn('relative p-4 hover:shadow-md transition-all duration-300', isNewest && 'border-primary/50 shadow-sm')}>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <a href={opp.url} target="_blank" rel="noopener noreferrer" className="group">
                <h4 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-2">
                  {opp.title}
                  <ExternalLink className="inline h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h4>
              </a>
              {opp.organization && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3" />
                  {opp.organization}
                </p>
              )}
            </div>

            {opp.confidence >= 0.7 && (
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                {Math.round(opp.confidence * 100)}% match
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{opp.summary}</p>

          <div className="flex flex-wrap gap-2 items-center">
            <Badge className={CATEGORY_COLORS[opp.category] ?? 'bg-muted text-muted-foreground'}>{opp.category}</Badge>
            <Badge variant="outline" className={TYPE_COLORS[opp.type] ?? 'border-border text-muted-foreground'}>
              {opp.type}
            </Badge>
            {opp.location_type && (
              <Badge variant="outline" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {opp.location_type}
              </Badge>
            )}
            {opp.deadline && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(opp.deadline).toLocaleDateString()}
              </Badge>
            )}
          </div>

          {isNewest && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-primary text-primary-foreground animate-pulse">New</Badge>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
})

export function LiveOpportunitiesFeed({ opportunities, className }: LiveOpportunitiesFeedProps) {
  const [displayedOpps, setDisplayedOpps] = useState<Opportunity[]>([])

  useEffect(() => {
    setDisplayedOpps((previous) => {
      const previousIds = new Set(previous.map((opp) => opp.id))
      const incoming = opportunities.filter((opp) => !previousIds.has(opp.id))
      if (incoming.length === 0) {
        return previous
      }
      return [...incoming.reverse(), ...previous]
    })
  }, [opportunities])

  const listHeight = useMemo(() => Math.min(FEED_MAX_HEIGHT, displayedOpps.length * ROW_HEIGHT), [displayedOpps.length])

  if (displayedOpps.length === 0) {
    return null
  }

  return (
    <PerformanceErrorBoundary title="Live feed failed to render" className={className}>
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="font-semibold text-lg">Live Results ({displayedOpps.length})</h3>
        </div>

        <List
          rowCount={displayedOpps.length}
          rowHeight={ROW_HEIGHT}
          rowComponent={OpportunityRow}
          rowProps={{ opportunities: displayedOpps }}
          className="overflow-y-auto"
          style={{ maxHeight: FEED_MAX_HEIGHT }}
          defaultHeight={listHeight}
          overscanCount={3}
        />
      </div>
    </PerformanceErrorBoundary>
  )
}
