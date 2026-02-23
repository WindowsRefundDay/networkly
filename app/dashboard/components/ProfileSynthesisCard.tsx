'use client'

import { motion } from "framer-motion"
import { CircleDashed } from "lucide-react"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { DASHBOARD_SPRING } from "./motion-presets"

export function ProfileSynthesisCard({ completionPercentage }: { completionPercentage: number }) {
    const prefersReducedMotion = useReducedMotion()
    const clampedCompletion = Math.min(100, Math.max(0, completionPercentage))

    return (
        <div className="flex flex-col items-center text-center relative h-full w-full justify-between">
            <h3 className="text-xs font-mono text-zinc-500 tracking-widest uppercase w-full text-left">Synthesis</h3>

            <div className="relative w-36 h-36 flex justify-center items-center mt-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background Track */}
                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                    {/* Foreground Progress (Google Blue) */}
                    <motion.circle
                        cx="50" cy="50" r="46"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="6"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                        initial={prefersReducedMotion ? false : { strokeDasharray: "289", strokeDashoffset: "289" }}
                        animate={{ strokeDashoffset: 289 - (289 * clampedCompletion) / 100 }}
                        transition={prefersReducedMotion ? { duration: 0 } : DASHBOARD_SPRING}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-zinc-100 tabular-nums font-mono tracking-tighter">
                        {clampedCompletion}%
                    </span>
                </div>

                {/* Breathing ambient ring */}
                <motion.div
                    className="absolute inset-2 rounded-full border border-blue-500/20"
                    animate={prefersReducedMotion
                        ? { opacity: 0.2, scale: 1 }
                        : { scale: [1, 1.08, 1], opacity: [0.35, 0.08, 0.35] }
                    }
                    transition={prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
                    }
                />
            </div>

            <div className="mt-8 w-full text-left bg-zinc-950 p-5 rounded-2xl border border-zinc-900/50 shadow-inner">
                <p className="text-xs font-medium text-blue-400 flex items-center gap-2 mb-2 border-b border-zinc-800/50 pb-2 uppercase tracking-wide">
                    <motion.span
                        animate={prefersReducedMotion ? { rotate: 0 } : { rotate: 360 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { duration: 14, repeat: Infinity, ease: "linear" }}
                    >
                        <CircleDashed className="w-3.5 h-3.5" strokeWidth={2} />
                    </motion.span>
                    Awaiting Input
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                    Add recent projects to reach 100% and unlock advanced networking nodes.
                </p>
            </div>
        </div>
    )
}
