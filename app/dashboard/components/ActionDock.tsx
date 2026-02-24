'use client'

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  CalendarBlank,
  ChartBar,
  Folder,
  GearSix,
  Graph,
  Globe,
  House,
  Robot,
  Student,
  UserCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { DASHBOARD_FAST_SPRING, DASHBOARD_SPRING } from "./motion-presets"

const navItems = [
  { label: "Home", icon: House, href: "/dashboard" },
  { label: "Profile", icon: UserCircle, href: "/profile" },
  { label: "Opportunities", icon: Globe, href: "/opportunities" },
  { label: "Projects", icon: Folder, href: "/projects" },
  { label: "Network", icon: Graph, href: "/network" },
  { label: "Mentors", icon: Student, href: "/mentors" },
  { label: "Events", icon: CalendarBlank, href: "/events" },
  { label: "Analytics", icon: ChartBar, href: "/analytics" },
  { label: "Settings", icon: GearSix, href: "/settings" },
]

export function ActionDock() {
  const pathname = usePathname()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.nav
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { ...DASHBOARD_SPRING, delay: 0.42 }}
      style={{ willChange: "transform, opacity" }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-[2rem] border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]"
    >
      {navItems.map((item, i) => {
        const isHovered = hoveredIndex === i
        const isAdjacent = hoveredIndex !== null && Math.abs(hoveredIndex - i) === 1
        const isActive = pathname === item.href

        let scale = 1
        if (isHovered) scale = 1.25
        else if (isAdjacent) scale = 1.1

        return (
          <div
            key={item.label}
            className={cn("relative group", i > 4 ? "hidden md:block" : "block")}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <Link href={item.href}>
              <motion.button
                animate={prefersReducedMotion ? undefined : { scale }}
                transition={prefersReducedMotion ? { duration: 0 } : DASHBOARD_FAST_SPRING}
                style={{ willChange: "transform" }}
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-2xl transition-colors relative",
                  isActive
                    ? "text-blue-500 bg-blue-500/10"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" weight="duotone" />

                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                  />
                )}
              </motion.button>
            </Link>

            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 5, scale: 0.92 }}
                  transition={prefersReducedMotion ? { duration: 0 } : DASHBOARD_FAST_SPRING}
                  className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-100 pointer-events-none whitespace-nowrap shadow-xl"
                >
                  {item.label}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-b border-r border-zinc-800 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      <div className="hidden md:block w-px h-8 bg-zinc-800 mx-2" />

      <div
        className="relative group block"
        onMouseEnter={() => setHoveredIndex(99)}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <Link href="/assistant">
          <motion.button
            animate={prefersReducedMotion ? undefined : { scale: hoveredIndex === 99 ? 1.15 : 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : DASHBOARD_FAST_SPRING}
            style={{ willChange: "transform" }}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 rounded-2xl border transition-colors ml-2 md:ml-0",
              pathname === "/assistant"
                ? "bg-blue-500/20 border-blue-500/50"
                : "bg-[#0F172A] border-blue-500/30 hover:bg-blue-900/20 hover:border-blue-500/50"
            )}
          >
            <Robot className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" weight="duotone" />
          </motion.button>
        </Link>

        <AnimatePresence>
          {hoveredIndex === 99 && (
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 5, scale: 0.92 }}
              transition={prefersReducedMotion ? { duration: 0 } : DASHBOARD_FAST_SPRING}
              className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-blue-500/30 text-[11px] font-medium text-zinc-100 pointer-events-none whitespace-nowrap shadow-xl flex items-center gap-2"
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 motion-safe:animate-pulse" />
              Agent Co-Pilot
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-b border-r border-blue-500/30 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.nav>
  )
}
