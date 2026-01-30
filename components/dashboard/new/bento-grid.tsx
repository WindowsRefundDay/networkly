"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface BentoGridProps {
  className?: string
  children: React.ReactNode
}

export const BentoGrid = ({ className, children }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 w-full mx-auto",
        className
      )}
    >
      {children}
    </div>
  )
}

interface BentoItemProps {
  className?: string
  children: React.ReactNode
  colSpan?: {
    sm?: number
    md?: number
    lg?: number
  }
  variant?: 'default' | 'ghost'
}

export const BentoItem = ({ className, children, colSpan, variant = 'default' }: BentoItemProps) => {
  const baseSpans: Record<number, string> = {
    1: "col-span-1",
    2: "col-span-2",
    3: "col-span-3",
    4: "col-span-4",
    5: "col-span-5",
    6: "col-span-6",
    7: "col-span-7",
    8: "col-span-8",
    9: "col-span-9",
    10: "col-span-10",
    11: "col-span-11",
    12: "col-span-12",
  }

  const mdSpans: Record<number, string> = {
    1: "md:col-span-1",
    2: "md:col-span-2",
    3: "md:col-span-3",
    4: "md:col-span-4",
    5: "md:col-span-5",
    6: "md:col-span-6",
    7: "md:col-span-7",
    8: "md:col-span-8",
    9: "md:col-span-9",
    10: "md:col-span-10",
    11: "md:col-span-11",
    12: "md:col-span-12",
  }

  const lgSpans: Record<number, string> = {
    1: "lg:col-span-1",
    2: "lg:col-span-2",
    3: "lg:col-span-3",
    4: "lg:col-span-4",
    5: "lg:col-span-5",
    6: "lg:col-span-6",
    7: "lg:col-span-7",
    8: "lg:col-span-8",
    9: "lg:col-span-9",
    10: "lg:col-span-10",
    11: "lg:col-span-11",
    12: "lg:col-span-12",
  }

  const smClass = baseSpans[colSpan?.sm || 1] || "col-span-1"
  const mdClass = mdSpans[colSpan?.md || 6] || "md:col-span-6" 
  const lgClass = lgSpans[colSpan?.lg || 12] || "lg:col-span-12"

  const defaultStyles = "glass-panel rounded-xl overflow-hidden transition-all duration-300"
  const ghostStyles = "bg-transparent shadow-none border-none p-0 overflow-visible"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        smClass,
        mdClass,
        lgClass,
        variant === 'ghost' ? ghostStyles : defaultStyles,
        className
      )}
    >
      {children}
    </motion.div>
  )
}
