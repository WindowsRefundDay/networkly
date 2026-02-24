'use client'

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { dashboardGridVariants, dashboardItemVariants } from "./motion-presets"

export function BentoGrid({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={dashboardGridVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full relative z-10"
    >
      {children}
    </motion.div>
  )
}

export function BentoItem({
  children,
  colSpan,
  className,
  label,
  description,
}: {
  children: React.ReactNode
  colSpan: string
  className?: string
  label?: string
  description?: string
}) {
  return (
    <div className={cn("flex h-full flex-col gap-3", colSpan)}>
      <motion.div
        variants={dashboardItemVariants}
        style={{ willChange: "transform, opacity" }}
        className={cn(
          "flex h-full flex-col justify-center rounded-[2rem] border border-zinc-800/80 bg-zinc-900/60 p-6 md:p-8 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.55)] relative overflow-hidden",
          className
        )}
      >
        <div className="absolute inset-0 rounded-[2rem] pointer-events-none border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />
        <div className="relative z-10 flex h-full flex-col">
          {children}
        </div>
      </motion.div>
      {(label || description) && (
        <motion.div
          variants={dashboardItemVariants}
          style={{ willChange: "transform, opacity" }}
          className="space-y-1 px-1"
        >
          {label ? (
            <p className="text-sm font-semibold tracking-tight text-zinc-200">
              {label}
            </p>
          ) : null}
          {description ? (
            <p className="text-xs text-zinc-500 leading-relaxed">
              {description}
            </p>
          ) : null}
        </motion.div>
      )}
    </div>
  )
}
