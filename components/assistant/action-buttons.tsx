'use client'

/**
 * Action Buttons - Confirmation buttons for chat actions
 */

import { Check, X, Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ActionButtonsProps {
  className?: string
}

interface BookmarkConfirmProps extends ActionButtonsProps {
  opportunityTitle: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function BookmarkConfirm({
  opportunityTitle,
  onConfirm,
  onCancel,
  isLoading,
  className,
}: BookmarkConfirmProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-muted/50 p-3', className)}>
      <p className="text-sm text-foreground mb-3">
        Would you like me to save <strong>{opportunityTitle}</strong> to your bookmarks?
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className="h-8"
        >
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {isLoading ? 'Saving...' : 'Yes, bookmark it'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="h-8"
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          No thanks
        </Button>
      </div>
    </div>
  )
}

interface WebDiscoveryConfirmProps extends ActionButtonsProps {
  query: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function WebDiscoveryConfirm({
  query,
  onConfirm,
  onCancel,
  isLoading,
  className,
}: WebDiscoveryConfirmProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-muted/50 p-3', className)}>
      <p className="text-sm text-foreground mb-1">
        I couldn't find any <strong>{query}</strong> opportunities in your saved matches.
      </p>
      <p className="text-sm text-muted-foreground mb-3">
        Would you like me to look across the web? This takes about a minute.
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className="h-8"
        >
          <Search className="h-3.5 w-3.5 mr-1.5" />
          {isLoading ? 'Searching...' : 'Yes, look on the web'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="h-8"
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          No thanks
        </Button>
      </div>
    </div>
  )
}
