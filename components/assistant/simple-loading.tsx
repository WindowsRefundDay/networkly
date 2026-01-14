'use client'

/**
 * Chat Loading States - Clean, simple loading indicators
 */

import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

interface SimpleLoadingProps {
  message?: string
  className?: string
}

export function SimpleLoading({ message = 'Looking...', className }: SimpleLoadingProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{message}</span>
    </div>
  )
}

interface DiscoveryLoadingProps {
  foundCount?: number
  className?: string
}

export function DiscoveryLoading({ foundCount, className }: DiscoveryLoadingProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-muted/50 p-4', className)}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <div className="absolute inset-0 h-6 w-6 animate-ping rounded-full bg-primary/20" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Looking across the web...
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            This may take a minute
          </p>
        </div>
      </div>
      
      {foundCount !== undefined && foundCount > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm text-primary">
            ✨ Found {foundCount} {foundCount === 1 ? 'opportunity' : 'opportunities'} so far...
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Typing indicator for AI responses
 */
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
    </div>
  )
}
