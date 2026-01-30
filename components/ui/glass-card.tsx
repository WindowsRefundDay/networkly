'use client'

import { motion } from 'framer-motion'
import type React from 'react'

import { cn } from '@/lib/utils'

export interface GlassCardProps {
  variant?: 'default' | 'hero' | 'sidebar' | 'compact'
  className?: string
  children: React.ReactNode
  glow?: boolean
  hover?: boolean
}

export function GlassCard({
  variant = 'default',
  className,
  children,
  glow = false,
  hover = false,
}: GlassCardProps) {
  const variants = {
    default: 'glass-panel',
    hero: 'glass-panel-hero',
    sidebar: 'glass-panel-sidebar',
    compact: 'glass-panel backdrop-blur-sm bg-background/50 border-border/30',
  }

  const glowStyles = glow
    ? 'shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]'
    : ''

  return (
    <motion.div
      className={cn(
        'rounded-xl transition-all duration-300',
        variants[variant],
        glowStyles,
        'will-change-[backdrop-filter,transform]',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className
      )}
      whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      // Ensure it can receive focus if it has an onClick or similar, but for now just styling
      // If the user adds tabIndex, this will look correct.
    >
      <div className="relative overflow-hidden rounded-xl h-full">
        <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none">
          <svg className="w-full h-full">
            <filter id="noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves="4"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
        </div>

        <div className="relative z-10 h-full">{children}</div>
      </div>
    </motion.div>
  )
}
