'use client'

import Link from "next/link"
import { motion } from "framer-motion"
import { Brain, CaretRight, GraduationCap, MagnifyingGlass, Terminal } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { DASHBOARD_FAST_SPRING } from "./motion-presets"

export function QuickActionsContainer() {
  const prefersReducedMotion = useReducedMotion()

  const actions = [
    {
      title: "Explore Opportunities",
      href: "/opportunities",
      icon: MagnifyingGlass,
      color: "text-zinc-300",
      bg: "bg-zinc-900/50",
    },
    {
      title: "Update Projects",
      href: "/projects",
      icon: Terminal,
      color: "text-zinc-300",
      bg: "bg-zinc-900/50",
    },
    {
      title: "Find Mentors",
      href: "/mentors",
      icon: GraduationCap,
      color: "text-zinc-300",
      bg: "bg-zinc-900/50",
    },
    {
      title: "Ask Assistant",
      href: "/assistant",
      icon: Brain,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    },
  ] as const

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {actions.map((action, i) => (
        <Link key={action.title} href={action.href} className="block">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.02, y: -2 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98, y: 1 }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { ...DASHBOARD_FAST_SPRING, delay: i * 0.06 }
            }
            style={{ willChange: "transform, opacity" }}
            className={cn(
              "relative group p-5 rounded-[1.5rem] border backdrop-blur-md transition-colors overflow-hidden flex items-center gap-4 hover:bg-zinc-800/80",
              action.border ?? "border-zinc-800/80",
              action.bg
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:motion-safe:animate-[shimmer_1.5s_linear_infinite]" />

            <div className="relative z-10 w-10 h-10 rounded-full bg-black/40 border border-zinc-700/50 flex flex-shrink-0 items-center justify-center shadow-inner">
              <action.icon className={cn("w-5 h-5", action.color)} weight="duotone" />
            </div>

            <span className="relative z-10 text-sm font-medium text-zinc-100 flex-1 flex items-center justify-between">
              {action.title}
              <CaretRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-zinc-500" weight="bold" />
            </span>
          </motion.div>
        </Link>
      ))}
    </div>
  )
}
