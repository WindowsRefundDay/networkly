'use client'

import { Check, X, Search } from 'lucide-react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { fadeInVariants } from './animations'

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
    <motion.div 
      className={cn(
        'rounded-xl border border-border/50 p-4',
        'backdrop-blur-sm bg-card/80',
        'shadow-lg shadow-black/5',
        className
      )}
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
    >
      <p className="text-sm text-foreground mb-3">
        Would you like me to save <strong>{opportunityTitle}</strong> to your bookmarks?
      </p>
      <div className="flex items-center gap-2">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="h-8"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            {isLoading ? 'Saving...' : 'Yes, bookmark it'}
          </Button>
        </motion.div>
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
    </motion.div>
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
    <motion.div 
      className={cn(
        'rounded-xl border border-border/50 p-4',
        'backdrop-blur-sm bg-card/80',
        'shadow-lg shadow-black/5',
        className
      )}
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
    >
      <p className="text-sm text-foreground mb-1">
        I couldn&apos;t find any <strong>{query}</strong> opportunities in your saved matches.
      </p>
      <p className="text-sm text-muted-foreground mb-3">
        Would you like me to look across the web? This takes about a minute.
      </p>
      <div className="flex items-center gap-2">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="h-8"
          >
            <Search className="h-3.5 w-3.5 mr-1.5" />
            {isLoading ? 'Searching...' : 'Yes, look on the web'}
          </Button>
        </motion.div>
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
    </motion.div>
  )
}
