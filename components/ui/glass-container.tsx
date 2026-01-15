'use client'

import { motion } from 'framer-motion'
import type React from 'react'

import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

interface GlassContainerProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function GlassContainer({
  children,
  delay = 0,
  className,
}: GlassContainerProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={cn(className)}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.5,
        ease: [0.23, 1, 0.32, 1],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
