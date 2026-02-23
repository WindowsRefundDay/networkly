'use client'

import { motion } from "framer-motion"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { DASHBOARD_FAST_SPRING, DASHBOARD_SPRING } from "./motion-presets"

export function WeeklyTelemetry({
    profileViews7d,
    newConnections7d,
    searchAppearancesTotal
}: {
    profileViews7d: number
    newConnections7d: number
    searchAppearancesTotal: number
}) {
    const prefersReducedMotion = useReducedMotion()

    const stats = [
        {
            label: "Profile Views",
            value: profileViews7d.toLocaleString(),
            target: "7D",
            progress: Math.min(1, profileViews7d / 100)
        },
        {
            label: "New Connections",
            value: newConnections7d.toLocaleString(),
            target: "7D",
            progress: Math.min(1, newConnections7d / 50)
        },
        {
            label: "Search Hits",
            value: searchAppearancesTotal.toLocaleString(),
            target: "TOTAL",
            progress: Math.min(1, searchAppearancesTotal / 500)
        }
    ]

    return (
        <div className="w-full flex justify-between flex-col h-full">
            <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-8 border-b border-zinc-800/60 pb-4">
                Weekly Telemetry Overview
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={prefersReducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { ...DASHBOARD_FAST_SPRING, delay: i * 0.07 }}
                        style={{ willChange: "transform, opacity" }}
                        className="group cursor-default bg-zinc-950/40 p-6 rounded-3xl border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50 transition-colors"
                    >
                        <div className="flex justify-between items-end mb-6">
                            <span className="text-sm text-zinc-400 font-medium tracking-tight group-hover:text-zinc-200 transition-colors">
                                {stat.label}
                            </span>
                            <div className="text-right">
                                <span className="text-3xl font-bold text-zinc-100 tabular-nums">
                                    {stat.value}
                                </span>
                                <span className="text-[10px] text-zinc-600 font-mono ml-2 tracking-widest">
                                    / {stat.target} GOAL
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar Track */}
                        <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900 shadow-inner">
                            <motion.div
                                initial={prefersReducedMotion ? false : { width: 0 }}
                                animate={{ width: `${Math.max(2, stat.progress * 100)}%` }} // Minimum 2% width for visibility
                                transition={prefersReducedMotion
                                    ? { duration: 0 }
                                    : { ...DASHBOARD_SPRING, delay: 0.08 + i * 0.06 }
                                }
                                className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
