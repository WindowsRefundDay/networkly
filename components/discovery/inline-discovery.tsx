"use client"

import { useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, CheckCircle2, Loader2, X } from "lucide-react"
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
            }, 2000)
        },
        persistState: true,
    })

    // Start discovery when isActive becomes true
    useEffect(() => {
        if (isActive && query && !discoveryActive && !state) {
            startDiscovery(query)
        }
    }, [isActive, query, discoveryActive, state, startDiscovery])

    // Handle stop
    const handleStop = useCallback(() => {
        stopDiscovery()
        onComplete()
    }, [stopDiscovery, onComplete])

    // Handle dismiss (clear state)
    const handleDismiss = useCallback(() => {
        clearState()
        onComplete()
    }, [clearState, onComplete])

    // Don't render if no state
    if (!state) return null

    const isRunning = state.status === 'running'
    const isComplete = state.status === 'complete'

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
        >
            <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 p-4 mb-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                        "p-2 rounded-full shrink-0 transition-colors",
                        isComplete ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
                    )}>
                        {isRunning && <Loader2 className="h-5 w-5 animate-spin" />}
                        {isComplete && <CheckCircle2 className="h-5 w-5" />}
                        {!isRunning && !isComplete && <Search className="h-5 w-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-foreground truncate">
                                {isRunning && "Discovering opportunities..."}
                                {isComplete && "Discovery complete!"}
                                {!isRunning && !isComplete && "Ready to search"}
                            </p>
                            {state.foundCount > 0 && (
                                <span className="shrink-0 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                                    +{state.foundCount} found
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {state.query}
                        </p>
                    </div>

                    {/* Progress bar */}
                    {isRunning && (
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${state.overallProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                                {state.overallProgress}%
                            </span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        {isRunning && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleStop}
                                className="text-xs h-7"
                            >
                                Stop
                            </Button>
                        )}
                        {isComplete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDismiss}
                                className="h-7 w-7"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Layer Accordion */}
                <LayerAccordion
                    state={state}
                    onToggleLayer={toggleLayerExpanded}
                />

                {/* Mobile: Single Layer View */}
                <MobileSingleLayerView state={state} />
            </div>
        </motion.div>
    )
}

// Mobile-optimized single layer view
function MobileSingleLayerView({ state }: { state: NonNullable<ReturnType<typeof useDiscoveryLayers>['state']> }) {
    const LAYER_ORDER = [
        'query_generation',
        'web_search', 
        'semantic_filter',
        'parallel_crawl',
        'ai_extraction',
        'db_sync',
    ] as const

    // Find the currently active layer
    const activeLayerId = LAYER_ORDER.find(id => state.layers[id]?.status === 'running')
    const activeLayer = activeLayerId ? state.layers[activeLayerId] : null

    if (!activeLayer) return null

    return (
        <div className="sm:hidden mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                <span className="text-xs font-medium text-primary">{activeLayer.name}</span>
            </div>
            {activeLayer.message && (
                <p className="text-xs text-muted-foreground">{activeLayer.message}</p>
            )}
            {activeLayer.reasoning && (
                <p className="text-xs text-muted-foreground italic mt-1">{activeLayer.reasoning}</p>
            )}
            {/* Progress for current layer */}
            {activeLayer.stats.total && activeLayer.stats.completed !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${(activeLayer.stats.completed / activeLayer.stats.total) * 100}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                        {activeLayer.stats.completed}/{activeLayer.stats.total}
                    </span>
                </div>
            )}
        </div>
    )
}
