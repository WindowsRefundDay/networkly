'use client'

import { motion } from "framer-motion"
import { CalendarDots, Pulse } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { DASHBOARD_FAST_SPRING } from "./motion-presets"

export function DashboardHeader({ name }: { name: string }) {
  const prefersReducedMotion = useReducedMotion()
  const timeLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 tracking-tight relative z-10 w-full">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : DASHBOARD_FAST_SPRING}
        style={{ willChange: "transform, opacity" }}
      >
        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 font-medium mb-4">
          Your Home Base
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-zinc-100 tracking-tighter mb-3">
          Hi {name},
        </h1>
        <p className="text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed">
          Here is your progress on projects, opportunities, and mentors.
        </p>
        <div className="mt-3 flex items-center gap-2 text-blue-400 text-[11px] md:text-xs uppercase tracking-[0.18em]">
          <Pulse weight="duotone" className="h-4 w-4" />
          <span>Updated Daily</span>
        </div>
      </motion.div>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          prefersReducedMotion ? { duration: 0 } : { ...DASHBOARD_FAST_SPRING, delay: 0.08 }
        }
        style={{ willChange: "transform, opacity" }}
        className="flex gap-4 items-center"
      >
        <div className="px-4 py-2.5 rounded-full border border-zinc-800 bg-zinc-900/70 backdrop-blur-md flex items-center gap-2 text-xs font-medium text-zinc-300 shadow-inner">
          <CalendarDots className="w-4 h-4 text-blue-400" weight="duotone" />
          <span
            suppressHydrationWarning
            className="uppercase tracking-[0.18em]"
            style={{ fontFamily: "var(--font-dashboard-mono), monospace" }}
          >
            {timeLabel}
          </span>
        </div>

        <button
          className={cn(
            "h-10 w-10 rounded-full border border-zinc-800 bg-zinc-900",
            "hover:border-blue-500/50 hover:bg-zinc-800 transition-colors",
            "flex items-center justify-center overflow-hidden group"
          )}
        >
          <span className="text-zinc-100 font-semibold text-sm group-hover:scale-110 transition-transform">
            {name.charAt(0)}
          </span>
        </button>
      </motion.div>
    </header>
  )
}
