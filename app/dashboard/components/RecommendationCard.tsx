'use client'

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { Globe, Zap, ArrowUpRight } from "lucide-react"
import type { DashboardRecommendation } from "@/lib/dashboard/telemetry-schema"

type RecommendationCardItem = {
    id: string
    title: string
    location: string
    match: number
}

export function RecommendationCard({
    recommendation
}: {
    recommendation: DashboardRecommendation | null
}) {
    const rawItems: RecommendationCardItem[] = recommendation
        ? [{
            id: recommendation.opportunityId,
            title: recommendation.title,
            location: `${recommendation.organization}${recommendation.location ? ` • ${recommendation.location}` : ""}`,
            match: recommendation.topMatchProbability,
        }]
        : [{
            id: "no-recommendation",
            title: "No recommendation available yet",
            location: "Telemetry worker is preparing your next best match",
            match: 0,
        }]

    const [items, setItems] = useState(rawItems)
    const [isProcessing, setIsProcessing] = useState(true)

    // Simulate an AI "sorting" sequence on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setItems([...rawItems].sort((a, b) => b.match - a.match))
            setIsProcessing(false)
        }, 1500)
        return () => clearTimeout(timer)
    }, [recommendation?.opportunityId])

    return (
        <div className="flex flex-col h-full justify-between relative overflow-hidden group">
            {/* Decorative gradient beam */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-transparent opacity-50" />

            <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-3">
                    <Zap className="w-3.5 h-3.5 text-blue-500" strokeWidth={2} />
                    Algorithmic Curation
                </h3>
                {isProcessing && (
                    <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                )}
            </div>

            <div className="flex-1 relative">
                <AnimatePresence>
                    {items.map((item, index) => (
                        <motion.div
                            layoutId={item.id}
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{
                                opacity: index === 0 ? 1 : 0.4,
                                x: 0,
                                scale: index === 0 ? 1 : 0.98,
                                y: index * 80 // Stack them visually if needed, though here we just render them in flow
                            }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className={`absolute top-0 left-0 w-full p-6 rounded-2xl border ${index === 0 ? 'border-zinc-800 bg-zinc-950/80 shadow-lg z-10' : 'border-zinc-900 bg-transparent z-0 pointer-events-none'} flex flex-col md:flex-row justify-between items-start md:items-center gap-6`}
                            style={{ top: index * 85 }} // Adjust vertical stacking
                        >
                            <div>
                                <h4 className={`font-bold transition-colors ${index === 0 ? 'text-zinc-100 text-xl' : 'text-zinc-500 text-lg'}`}>
                                    {item.title}
                                </h4>
                                <p className="text-zinc-500 text-xs flex items-center gap-2 mt-2 tracking-wide">
                                    <Globe className="w-3.5 h-3.5" /> {item.location}
                                </p>
                            </div>

                            <div className="flex flex-col items-end">
                                <div className={`text-4xl font-black tabular-nums tracking-tighter ${index === 0 ? 'text-blue-500 drop-shadow-[0_0_12px_rgba(59,130,246,0.2)]' : 'text-zinc-700'}`}>
                                    {item.match}%
                                </div>
                                <div className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase mt-1">
                                    Match Probability
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Action footer for the top item */}
            <motion.div
                className="mt-32 pt-6 border-t border-zinc-900/50 flex justify-end"
                initial={{ opacity: 0 }}
                animate={{ opacity: isProcessing ? 0 : 1 }}
            >
                <button className="text-xs font-mono text-zinc-400 hover:text-blue-400 flex items-center gap-2 transition-colors group/btn">
                    Review Top Match <ArrowUpRight className="w-3.5 h-3.5 transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </button>
            </motion.div>
        </div>
    )
}
