'use client'

import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'
import { PREMIUM_EASE, pulseLoaderVariants } from './animations'

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
    <div className={cn('rounded-xl border border-border/50 backdrop-blur-sm bg-card/80 p-4 shadow-lg shadow-black/5', className)}>
      <div className="flex items-center gap-3">
        <motion.div 
          className="relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-6 w-6 text-primary" />
          <motion.div 
            className="absolute inset-0 h-6 w-6 rounded-full bg-primary/20"
            variants={pulseLoaderVariants}
            animate="pulse"
          />
        </motion.div>
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
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-sm text-primary font-medium">
            Found {foundCount} {foundCount === 1 ? 'opportunity' : 'opportunities'} so far...
          </p>
        </div>
      )}
    </div>
  )
}

export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-primary/60"
          animate={{
            y: [0, -4, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: PREMIUM_EASE,
          }}
        />
      ))}
    </div>
  )
}
