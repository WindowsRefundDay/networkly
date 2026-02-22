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
  X,
  UserCheck,
  Download
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useDiscoveryLayers } from "@/hooks/use-discovery-layers"
import { LiveOpportunityCard, type LiveOpportunity } from "@/components/discovery/live-opportunity-card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DiscoveryTriggerCardProps {
  /** Pre-fill the search input */
  initialQuery?: string
  /** Callback when discovery completes */
  onComplete?: (count: number) => void
  /** Callback when user clicks Import — receives all discovered opportunities */
  onImport?: (opportunities: LiveOpportunity[]) => void
  /** Show compact version (less padding) */
  compact?: boolean
  /** Additional className */
  className?: string
  /** Whether personalization is enabled */
  personalizedEnabled?: boolean
  /** Callback when personalization toggle changes */
  onPersonalizedChange?: (enabled: boolean) => void
  /** The user's profile ID for personalization */
  userProfileId?: string
  /** IDs of opportunities already shown on the page — discovery will skip these */
  existingOpportunityIds?: Set<string>
  /** Titles of opportunities already in Browse All — used to dedup discovery results */
  existingOpportunityTitles?: Set<string>
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
  onImport,
  compact = false,
  className,
  personalizedEnabled = false,
  onPersonalizedChange,
  userProfileId,
  existingOpportunityIds,
  existingOpportunityTitles,
}: DiscoveryTriggerCardProps) {
  const [query, setQuery] = useState(initialQuery)
  const [showSuggestions, setShowSuggestions] = useState(!initialQuery)
  const [liveOpportunities, setLiveOpportunities] = useState<LiveOpportunity[]>([])
  const [imported, setImported] = useState(false)

  const [isExpanded, setIsExpanded] = useState(!compact)

  const toggleExpanded = useCallback(() => {
    if (compact) {
      setIsExpanded(prev => !prev)
    }
  }, [compact])

  const {
    state,
    isActive,
    startDiscovery,
    stopDiscovery,
    toggleLayerExpanded,
    clearState,
  } = useDiscoveryLayers({
    onOpportunityFound: (event) => {
      console.log('[DiscoveryCard] onOpportunityFound called:', event)
      const e = event as Record<string, any>
      const eventId = e.id || e.url
      let eventTitle = e.title?.trim() || ''

      // Must have at least an ID or URL
      if (!eventId) {
        console.warn('[DiscoveryCard] Skipping opportunity - no ID or URL')
        return
      }

      // Generate fallback title if empty
      if (!eventTitle) {
        try {
          const fallbackTitle = e.url
            ? new URL(e.url).hostname.replace('www.', '').split('.')[0]
            : 'Untitled'
          eventTitle = fallbackTitle.charAt(0).toUpperCase() + fallbackTitle.slice(1)
          console.log('[DiscoveryCard] Using fallback title:', eventTitle)
        } catch (error) {
          eventTitle = 'Untitled'
          console.log('[DiscoveryCard] Failed to parse URL, using default title')
        }
      }

      const opp: LiveOpportunity = {
        id: eventId,
        title: eventTitle,
        organization: e.organization || '',
        category: e.category || '',
        opportunityType: e.opportunityType || e.type || '',
        url: e.url,
        locationType: e.locationType || '',
        confidence: e.confidence ?? e.similarity,
      }
      setLiveOpportunities(prev => {
        if (prev.some(o => o.id === opp.id)) return prev
        const titleKey = opp.title.trim().toLowerCase()
        if (prev.some(o => o.title.trim().toLowerCase() === titleKey)) return prev
        return [...prev, opp]
      })
      // Don't auto-push to Browse All — user will use Import button
    },
    onComplete: (count) => {
      console.log('[DiscoveryCard] onComplete called with count:', count, 'liveOpportunities:', liveOpportunities.length)
      setTimeout(() => {
        onComplete?.(count)
      }, 0)
    },
    persistState: true,
    existingIds: existingOpportunityIds,
    existingTitles: existingOpportunityTitles,
  })

  const isComplete = state?.status === "complete"
  const isRunning = state?.status === "running"
  const isError = state?.status === "error"

  const showExpanded = isExpanded || isRunning || isComplete || isError

  const handleStartDiscovery = useCallback(() => {
    if (query.trim().length < 2) return
    setLiveOpportunities([])
    setImported(false)
    startDiscovery(query, {
      isPersonalized: personalizedEnabled,
      userProfileId: userProfileId,
    })
    setShowSuggestions(false)
  }, [query, startDiscovery, personalizedEnabled, userProfileId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleStartDiscovery()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setLiveOpportunities([])
    setImported(false)
    startDiscovery(suggestion, {
      isPersonalized: personalizedEnabled,
      userProfileId: userProfileId,
    })
    setShowSuggestions(false)
  }

  const handleDismiss = () => {
    clearState()
    setQuery("")
    setShowSuggestions(true)
    setLiveOpportunities([])
    setImported(false)
    if (compact) {
      setIsExpanded(false)
    }
  }

  const handleImport = useCallback(() => {
    if (liveOpportunities.length === 0 || imported) return
    setImported(true)
    onImport?.(liveOpportunities)
  }, [liveOpportunities, imported, onImport])

  const handleOpportunityClick = useCallback((opp: LiveOpportunity) => {
    if (opp.url) {
      window.open(opp.url, "_blank")
    }
  }, [])

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-300 backdrop-blur-xl",
        isRunning
          ? "border-primary/20 bg-primary/5 shadow-[0_0_30px_-5px_rgba(var(--primary-rgb),0.1)]"
          : isError
            ? "border-red-500/20 bg-red-500/5"
            : isComplete
              ? "border-green-500/20 bg-green-500/5"
              : "border-border/40 bg-background/40 hover:border-border/60 hover:bg-background/60 shadow-sm",
        compact && !showExpanded ? "p-3 cursor-pointer" : compact ? "p-4" : "p-6",
        className
      )}
      onClick={compact && !showExpanded ? toggleExpanded : undefined}
    >
      {/* Compact Trigger View */}
      {compact && !showExpanded && (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground">Can't find what you're looking for?</h3>
            <p className="text-xs text-muted-foreground truncate">Use AI to search the web for new opportunities</p>
          </div>
          <Button size="sm" variant="secondary" className="gap-2 shrink-0">
            <Zap className="h-3.5 w-3.5" />
            Start Discovery
          </Button>
        </div>
      )}

      {/* Expanded View */}
      <AnimatePresence>
        {(!compact || showExpanded) && (
          <motion.div
            initial={compact ? { opacity: 0, height: 0 } : false}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "p-2.5 rounded-xl shrink-0 transition-colors",
                  isRunning
                    ? "bg-primary/10"
                    : isError
                      ? "bg-red-500/10"
                      : isComplete
                        ? "bg-green-500/10"
                        : "bg-muted"
                )}
              >
                {isRunning && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                {isError && <X className="h-5 w-5 text-red-500" />}
                {isComplete && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {!isRunning && !isComplete && !isError && <Globe className="h-5 w-5 text-muted-foreground" />}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">
                  {isRunning
                    ? "Discovering opportunities..."
                    : isError
                      ? "Discovery failed"
                      : isComplete
                        ? "Discovery complete!"
                        : "Find more opportunities"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isRunning
                    ? `Searching the web for "${state?.query}"`
                    : isError
                      ? "Could not connect to the discovery service. Try again later."
                      : isComplete
                        ? `Found ${liveOpportunities.length} new ${liveOpportunities.length === 1 ? "opportunity" : "opportunities"}`
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
                    onClick={(e) => {
                      e.stopPropagation();
                      stopDiscovery();
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    Stop
                  </Button>
                </div>
              )}

              {(isComplete || isError || (compact && showExpanded && !isRunning)) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isComplete || isError) handleDismiss();
                    else setIsExpanded(false);
                  }}
                  className="h-7 w-7 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Search Input (only when idle) */}
            <AnimatePresence mode="wait">
              {!isRunning && !isComplete && !isError && (
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
                        autoFocus={compact && showExpanded}
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

                  {/* Personalization Toggle */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                              <UserCheck className={cn("h-4 w-4", personalizedEnabled ? "text-primary" : "text-muted-foreground")} />
                              <Label htmlFor="personalized-mode" className="text-sm font-medium cursor-pointer">
                                Personalized Discovery
                              </Label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[250px]">
                            <p>Uses your profile data (interests, goals, strengths) to find more relevant opportunities.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Switch
                      id="personalized-mode"
                      checked={personalizedEnabled}
                      onCheckedChange={onPersonalizedChange}
                      disabled={!userProfileId}
                    />
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
                  className="space-y-4"
                >
                  {/* Simple progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Searching the web for opportunities...</span>
                      <span className="font-mono text-primary font-medium">{state.overallProgress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${state.overallProgress}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Live streaming opportunities */}
                  {liveOpportunities.length > 0 && (
                    <div className="space-y-2">
                      <div className="h-[1px] bg-border/50" />
                      <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                        {liveOpportunities.map((opp, index) => (
                          <LiveOpportunityCard
                            key={opp.id}
                            opportunity={opp}
                            onClick={handleOpportunityClick}
                            index={index}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Error state */}
              {isError && state && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-400">
                        Discovery service unavailable. Please try again.
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss();
                      }}
                      className="text-xs"
                    >
                      Try again
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
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
                        {liveOpportunities.length} {liveOpportunities.length === 1 ? "opportunity" : "opportunities"} found
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Import button */}
                      {liveOpportunities.length > 0 && (
                        <Button
                          variant={imported ? "ghost" : "default"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleImport()
                          }}
                          disabled={imported}
                          className={cn(
                            "gap-2 text-xs",
                            imported && "text-green-500"
                          )}
                        >
                          {imported ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Imported
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5" />
                              Import to Browse All
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismiss();
                        }}
                        className="text-xs"
                      >
                        Search again
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  {/* Show found opportunities after completion */}
                  {liveOpportunities.length > 0 && (
                    <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                      {liveOpportunities.map((opp, index) => (
                        <LiveOpportunityCard
                          key={opp.id}
                          opportunity={opp}
                          onClick={handleOpportunityClick}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
