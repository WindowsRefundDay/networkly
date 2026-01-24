"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  Globe, 
  Sparkles, 
  Loader2, 
  ArrowRight,
  Zap,
  CheckCircle2,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useDiscoveryLayers } from "@/hooks/use-discovery-layers"
import { LayerAccordion } from "@/components/discovery/layer-accordion"

interface DiscoveryTriggerCardProps {
  /** Pre-fill the search input */
  initialQuery?: string
  /** Callback when discovery completes */
  onComplete?: (count: number) => void
  /** Callback when new opportunity is found */
  onNewOpportunity?: (opportunity: {
    id: string
    title: string
    organization: string
    type: string
  }) => void
  /** Show compact version (less padding) */
  compact?: boolean
  /** Additional className */
  className?: string
}

const DISCOVERY_SUGGESTIONS = [
  "AI/ML internships",
  "Research programs",
  "Summer fellowships", 
  "STEM competitions",
  "Volunteer opportunities",
]

export function DiscoveryTriggerCard({
  initialQuery = "",
  onComplete,
  onNewOpportunity,
  compact = false,
  className,
}: DiscoveryTriggerCardProps) {
  const [query, setQuery] = useState(initialQuery)
  const [showSuggestions, setShowSuggestions] = useState(!initialQuery)

  const {
    state,
    isActive,
    startDiscovery,
    stopDiscovery,
    toggleLayerExpanded,
    clearState,
  } = useDiscoveryLayers({
    onOpportunityFound: (event) => {
      if (onNewOpportunity && "id" in event && "title" in event) {
        onNewOpportunity({
          id: (event as { id: string }).id,
          title: (event as { title: string }).title,
          organization: (event as { organization?: string }).organization || "",
          type: (event as { type?: string }).type || "",
        })
      }
    },
    onComplete: (count) => {
      onComplete?.(count)
    },
    persistState: true,
  })

  const handleStartDiscovery = useCallback(() => {
    if (query.trim().length < 2) return
    setShowSuggestions(false)
    startDiscovery(query.trim())
  }, [query, startDiscovery])

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    startDiscovery(suggestion)
  }, [startDiscovery])

  const handleDismiss = useCallback(() => {
    clearState()
    setShowSuggestions(true)
  }, [clearState])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim().length >= 2) {
      handleStartDiscovery()
    }
  }

  const isComplete = state?.status === "complete"
  const isRunning = state?.status === "running"

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-300",
        isRunning
          ? "border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/5"
          : isComplete
            ? "border-green-500/30 bg-gradient-to-br from-green-500/5 via-background to-green-500/5"
            : "border-border bg-gradient-to-br from-muted/30 via-background to-muted/30",
        compact ? "p-4" : "p-6",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={cn(
            "p-2.5 rounded-xl shrink-0 transition-colors",
            isRunning
              ? "bg-primary/10"
              : isComplete
                ? "bg-green-500/10"
                : "bg-muted"
          )}
        >
          {isRunning && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
          {isComplete && <CheckCircle2 className="h-5 w-5 text-green-500" />}
          {!isRunning && !isComplete && <Globe className="h-5 w-5 text-muted-foreground" />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">
            {isRunning
              ? "Discovering opportunities..."
              : isComplete
                ? "Discovery complete!"
                : "Find more opportunities"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isRunning
              ? `Searching for "${state?.query}"`
              : isComplete
                ? `Found ${state?.foundCount || 0} new opportunities`
                : "Search the web for internships, programs, and more"}
          </p>
        </div>

        {/* Progress indicator / dismiss button */}
        {isRunning && state && (
          <div className="flex items-center gap-2">
            <div className="text-sm font-mono text-primary">
              {state.overallProgress}%
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={stopDiscovery}
              className="h-7 px-2 text-xs"
            >
              Stop
            </Button>
          </div>
        )}

        {isComplete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-7 w-7 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Input (only when idle) */}
      <AnimatePresence mode="wait">
        {!isRunning && !isComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="What are you looking for?"
                  className="pl-10 h-11 bg-background"
                />
              </div>
              <Button
                onClick={handleStartDiscovery}
                disabled={query.trim().length < 2}
                className="h-11 px-5 gap-2"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Discover</span>
              </Button>
            </div>

            {/* Quick suggestions */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex flex-wrap gap-2"
                >
                  <span className="text-xs text-muted-foreground self-center mr-1">
                    Try:
                  </span>
                  {DISCOVERY_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full",
                        "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
                        "transition-colors cursor-pointer"
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Discovery progress (when running) */}
        {isRunning && state && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <LayerAccordion
              state={state}
              onToggleLayer={toggleLayerExpanded}
              className="max-h-[300px] overflow-y-auto"
            />
          </motion.div>
        )}

        {/* Completion summary (when done) */}
        {isComplete && state && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  {state.foundCount} new {state.foundCount === 1 ? "opportunity" : "opportunities"} added
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-xs"
              >
                Search again
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
