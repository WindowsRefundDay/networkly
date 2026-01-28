"use client"

import { useEffect, useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, CheckCircle2, Loader2, X, ChevronDown, Sparkles } from "lucide-react"
import { useDiscoveryLayers } from "@/hooks/use-discovery-layers"
import { LayerAccordion } from "./layer-accordion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ExtractedCard {
    title: string
    organization: string
    type: string
    location?: string
}

interface InlineDiscoveryProps {
    isActive: boolean
    query: string
    onComplete: () => void
    onNewOpportunity?: (card: ExtractedCard) => void
}

const HUMOROUS_STATUSES = [
    "Scouring the depths...",
    "Asking Bill if he can find some...",
    "Bill couldn't find any :(",
    "Looking under the bed...",
    "Consulting the oracle...",
    "Rummaging through the archives...",
    "Connecting the dots...",
    "Firing up the engines...",
    "Doing some heavy lifting...",
    "Polishing the gems...",
    "Checking the couch cushions...",
    "Summoning the digital spirits...",
]

export function InlineDiscovery({ isActive, query, onComplete, onNewOpportunity }: InlineDiscoveryProps) {
    const {
        state,
        isActive: discoveryActive,
        startDiscovery,
        stopDiscovery,
        toggleLayerExpanded,
        clearState,
    } = useDiscoveryLayers({
        onOpportunityFound: (event) => {
            if (onNewOpportunity && 'title' in event) {
                onNewOpportunity({
                    title: (event as { title: string }).title,
                    organization: (event as { organization?: string }).organization || '',
                    type: (event as { type?: string }).type || '',
                    location: (event as { locationType?: string }).locationType,
                })
            }
        },
        onComplete: () => {
            // Delay onComplete to allow UI to show completion state
            setTimeout(() => {
                onComplete()
            }, 3000)
        },
        persistState: true,
    })

    const [isExpanded, setIsExpanded] = useState(false)
    const [statusIndex, setStatusIndex] = useState(0)
    const [currentMessage, setCurrentMessage] = useState("")

    // Start discovery when isActive becomes true
    useEffect(() => {
        if (isActive && query && !discoveryActive && !state) {
            startDiscovery(query)
        }
    }, [isActive, query, discoveryActive, state, startDiscovery])

    // Status rotation logic
    useEffect(() => {
        if (!discoveryActive) return

        // Initial message
        setCurrentMessage(`Searching for "${query}"`)

        const interval = setInterval(() => {
            setStatusIndex((prev) => (prev + 1) % HUMOROUS_STATUSES.length)
        }, 3000)

        return () => clearInterval(interval)
    }, [discoveryActive, query])

    // Update message based on index or real events
    useEffect(() => {
        if (!discoveryActive) return

        // Randomly decide whether to show a real status or a humorous one
        // Bias towards humorous ones for "dumbed down" fee
        const showHumorous = Math.random() > 0.3

        if (showHumorous) {
            setCurrentMessage(HUMOROUS_STATUSES[statusIndex])
        } else {
            // Try to get a real status from the active layer
            const activeLayerId = state?.layers ? Object.keys(state.layers).find(id => state.layers[id as keyof typeof state.layers].status === 'running') : null
            if (activeLayerId) {
                const layerName = state?.layers[activeLayerId as keyof typeof state.layers].name
                setCurrentMessage(`Analyzing ${layerName}...`)
            } else {
                setCurrentMessage(HUMOROUS_STATUSES[statusIndex])
            }
        }
    }, [statusIndex, discoveryActive, state])


    // Handle stop
    const handleStop = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        stopDiscovery()
        onComplete()
    }, [stopDiscovery, onComplete])

    // Handle dismiss (clear state)
    const handleDismiss = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        clearState()
        onComplete()
    }, [clearState, onComplete])

    // Don't render if no state
    if (!state) return null

    const isRunning = state.status === 'running'
    const isComplete = state.status === 'complete'

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 z-50",
                "flex flex-col items-center justify-end",
                "pointer-events-none" // Allow clicking through empty space
            )}
        >
            <div className={cn(
                "relative pointer-events-auto transition-all duration-500 ease-in-out",
                isExpanded ? "w-[90vw] max-w-2xl" : "w-auto"
            )}>
                {/* Main Pill / Header */}
                <motion.div
                    layout="position"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                        "relative flex items-center gap-3 px-4 py-3",
                        "bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl",
                        "hover:bg-background/90 transition-colors cursor-pointer",
                        isExpanded ? "rounded-t-2xl border-b-0" : "rounded-full"
                    )}
                >
                    {/* Status Icon */}
                    <div className={cn(
                        "flex items-center justify-center p-1.5 rounded-full shrink-0 transition-colors duration-500",
                        isComplete ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/20 text-primary"
                    )}>
                        {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isComplete && <CheckCircle2 className="h-4 w-4" />}
                        {!isRunning && !isComplete && <Sparkles className="h-4 w-4" />}
                    </div>

                    {/* Status Text (Animated) */}
                    <div className="flex-1 min-w-[200px] max-w-[300px] overflow-hidden flex flex-col justify-center h-10">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isComplete ? "complete" : currentMessage}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col"
                            >
                                <p className="font-medium text-sm text-foreground/90 truncate">
                                    {isComplete ? "Discovery Complete!" : currentMessage}
                                </p>
                                <p className="text-xs text-muted-foreground truncate font-light">
                                    {isComplete
                                        ? `Found ${state.foundCount} opportunities`
                                        : state.query}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Completion Badge */}
                    {state.foundCount > 0 && (
                        <div className="hidden sm:flex shrink-0 items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <span className="text-[10px] font-bold text-emerald-500">
                                {state.foundCount}
                            </span>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-2 pl-2 border-l border-white/10 ml-2">
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
                        </motion.div>

                        {/* Close/Stop Button */}
                        <div onClick={isComplete ? handleDismiss : handleStop} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                            <X className="h-4 w-4 text-muted-foreground/70" />
                        </div>
                    </div>

                    {/* Progress Bar (Bottom of pill when collapsed) */}
                    {!isExpanded && isRunning && (
                        <motion.div
                            layout
                            className="absolute bottom-0 left-4 right-4 h-[2px] bg-white/5 rounded-full overflow-hidden"
                        >
                            <motion.div
                                className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${state.overallProgress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </motion.div>
                    )}
                </motion.div>

                {/* Expanded Content */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-background/95 backdrop-blur-xl border border-white/10 border-t-0 rounded-b-2xl shadow-2xl"
                        >
                            <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {/* Original Detailed View */}
                                <LayerAccordion
                                    state={state}
                                    onToggleLayer={toggleLayerExpanded}
                                />

                                {/* Mobile Layer View (preserved from original) */}
                                <MobileSingleLayerView state={state} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}

function MobileSingleLayerView({ state }: { state: NonNullable<ReturnType<typeof useDiscoveryLayers>['state']> }) {
    const LAYER_ORDER = [
        'query_generation',
        'web_search',
        'semantic_filter',
        'parallel_crawl',
        'ai_extraction',
        'db_sync',
    ] as const

    const activeLayerId = LAYER_ORDER.find(id => state.layers[id]?.status === 'running')
    const activeLayer = activeLayerId ? state.layers[activeLayerId] : null

    if (!activeLayer) return null

    return (
        <div className="sm:hidden mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                <span className="text-xs font-medium text-primary">{activeLayer.name}</span>
            </div>
            {/* Simple message display for mobile */}
            <div className="text-xs text-muted-foreground">
                Processing...
            </div>
        </div>
    )
}
