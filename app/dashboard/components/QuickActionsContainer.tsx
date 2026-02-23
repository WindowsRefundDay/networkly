'use client'

import { motion } from "framer-motion"
import { Search, Terminal, BrainCircuit, ChevronRight } from "lucide-react"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { DASHBOARD_FAST_SPRING } from "./motion-presets"

export function QuickActionsContainer() {
    const prefersReducedMotion = useReducedMotion()

    const actions = [
        { title: "Find Jobs", icon: Search, color: "text-slate-300", bg: "bg-zinc-900/50" },
        { title: "Add Project", icon: Terminal, color: "text-slate-300", bg: "bg-zinc-900/50" },
        { title: "AI Assistant", icon: BrainCircuit, color: "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]", bg: "bg-blue-500/10", border: 'border-blue-500/30' }
    ]

    return (
        <div className="flex flex-col gap-4 w-full h-full">
            {actions.map((action, i) => (
                <motion.button
                    key={i}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.02, y: -2 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                    transition={prefersReducedMotion ? { duration: 0 } : { ...DASHBOARD_FAST_SPRING, delay: i * 0.06 }}
                    style={{ willChange: "transform, opacity" }}
                    className={`relative group p-5 rounded-[1.5rem] border ${action.border || 'border-zinc-800/80'} ${action.bg} backdrop-blur-md transition-colors overflow-hidden flex items-center gap-4 hover:bg-zinc-800/80`}
                >
                    {/* Subtle hover gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:motion-safe:animate-[shimmer_1.5s_linear_infinite]" />

                    <div className="relative z-10 w-10 h-10 rounded-full bg-black/40 border border-zinc-700/50 flex flex-shrink-0 items-center justify-center shadow-inner">
                        <action.icon className={`w-5 h-5 ${action.color}`} strokeWidth={1.5} />
                    </div>

                    <span className="relative z-10 text-sm font-medium text-zinc-100 flex-1 flex items-center justify-between">
                        {action.title}
                        <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-zinc-500" strokeWidth={1.5} />
                    </span>
                </motion.button>
            ))}
        </div>
    )
}
