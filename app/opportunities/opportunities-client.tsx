"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Sparkles, Bookmark, Send, Loader2, Globe, X, UserCheck, Users } from "lucide-react"
import type { LiveOpportunity } from "@/components/discovery/live-opportunity-card"
import {
  getOpportunities,
  getOpportunitiesBootstrap,
  searchOpportunities,
  getOpportunitiesByIds,
  getPersonalizedOpportunities
} from "@/app/actions/opportunities"
import { updateStatus, type OpportunityStatus } from "@/app/actions/opportunity-status"
import { useHasMounted } from "@/hooks/use-has-mounted"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { PerformanceErrorBoundary } from "@/components/ui/performance-error-boundary"
import type { Opportunity } from "@/types/opportunity"

const OpportunityList = dynamic(
  () => import("@/components/opportunities/opportunity-list").then((mod) => mod.OpportunityList),
  {
    loading: () => <div className="h-72 rounded-xl bg-muted animate-pulse" />,
  }
)

const ExpandedOpportunityCard = dynamic(
  () => import("@/components/opportunities/expanded-opportunity-card").then((mod) => mod.ExpandedOpportunityCard),
  {
    loading: () => null,
  }
)

const DiscoveryTriggerCard = dynamic(
  () => import("@/components/opportunities/discovery-trigger-card").then((mod) => mod.DiscoveryTriggerCard),
  {
    loading: () => <div className="h-28 rounded-xl bg-muted animate-pulse" />,
  }
)

interface OpportunitiesClientProps {
  initialHighlightId?: string | null
}

const CATEGORIES = [
  "All",
  "Internship",
  "Research",
  "Competition",
  "Program",
  "Event",
  "Job"
]

export default function OpportunitiesClient({ initialHighlightId }: OpportunitiesClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [statuses, setStatuses] = useState<Record<string, OpportunityStatus>>({})
  const [searchResults, setSearchResults] = useState<Opportunity[] | null>(null)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isSearching, setIsSearching] = useState(false)
  const [discoveryStatus, setDiscoveryStatus] = useState<{
    triggered: boolean
    newFound: number
  } | null>(null)
  const [userProfileId, setUserProfileId] = useState<string | undefined>()
  const [personalizedDiscovery, setPersonalizedDiscovery] = useState(false)
  const [personalized, setPersonalized] = useState(false) // Main toggle: "For You" vs "All"
  const [personalizedOpportunities, setPersonalizedOpportunities] = useState<Opportunity[]>([])
  const [personalizedLoading, setPersonalizedLoading] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const hasMounted = useHasMounted()
  const router = useRouter()

  const discoveredQueriesRef = useRef<Set<string>>(new Set())

  // Memoize the set of already-loaded opportunity IDs and titles so discovery can skip them
  const existingOpportunityIds = useMemo(() => new Set(opportunities.map((o) => o.id)), [opportunities])
  const existingOpportunityTitles = useMemo(() => new Set(opportunities.map((o) => o.title.trim().toLowerCase())), [opportunities])

  useEffect(() => {
    let mounted = true

    async function bootstrapOpportunities() {
      try {
        const bootstrap = await getOpportunitiesBootstrap(50)
        if (!mounted) return

        const initialOpportunities = bootstrap.opportunities.opportunities as Opportunity[]

        setOpportunities(initialOpportunities)
        setHasMore(bootstrap.opportunities.hasMore)
        setTotalCount(bootstrap.opportunities.totalCount)
        setCurrentPage(1)
        setStatuses(bootstrap.statuses)
        setUserProfileId(bootstrap.userProfileId)
        setPersonalizedDiscovery(bootstrap.personalizedDiscovery)
        setProfileComplete(bootstrap.profileComplete)
        setPersonalizedOpportunities(bootstrap.personalizedOpportunities as Opportunity[])
        setPersonalized(bootstrap.personalizedEnabledByDefault)

        if (initialHighlightId && initialOpportunities.length > 0) {
          const found = initialOpportunities.find((o) => o.id === initialHighlightId)
          if (found) {
            setSelectedOpportunity(found)
          }
        }
      } catch (error) {
        console.error("[OpportunitiesPage] Error fetching opportunities:", error)
        if (mounted) {
          setOpportunities([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    bootstrapOpportunities()
    return () => {
      mounted = false
    }
  }, [initialHighlightId])

  // Fetch personalized opportunities
  const fetchPersonalizedOpportunities = useCallback(async () => {
    setPersonalizedLoading(true)
    try {
      const result = await getPersonalizedOpportunities(20)
      setProfileComplete(result.profileComplete)
      if (result.profileComplete && result.opportunities.length > 0) {
        setPersonalizedOpportunities(result.opportunities as Opportunity[])
      } else {
        setPersonalizedOpportunities([])
      }
    } catch (error) {
      console.error("[OpportunitiesPage] Error fetching personalized:", error)
      setPersonalizedOpportunities([])
    } finally {
      setPersonalizedLoading(false)
    }
  }, [])

  // Refetch personalized when toggled on
  useEffect(() => {
    if (personalized && personalizedOpportunities.length === 0 && !personalizedLoading) {
      fetchPersonalizedOpportunities()
    }
  }, [personalized, personalizedOpportunities.length, personalizedLoading, fetchPersonalizedOpportunities])

  const performSearch = useDebouncedCallback(async (query: string, type: string) => {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      setSearchResults(null)
      setDiscoveryStatus(null)
      setIsSearching(false)
      return
    }

    const queryKey = `${trimmedQuery.toLowerCase()}:${type}`
    const alreadyDiscovered = discoveredQueriesRef.current.has(queryKey)

    setIsSearching(true)
    setDiscoveryStatus(null)

    try {
      const result = await searchOpportunities(trimmedQuery, {
        type: type !== "all" ? type : undefined,
      })

      setSearchResults(result.opportunities as Opportunity[])

      if (result.discoveryTriggered && !alreadyDiscovered) {
        discoveredQueriesRef.current.add(queryKey)
        setDiscoveryStatus({
          triggered: true,
          newFound: result.newOpportunitiesFound,
        })
      }

      if (result.newOpportunitiesFound > 0) {
        const refreshedData = await getOpportunities({ page: 1, pageSize: 50 })
        setOpportunities(refreshedData.opportunities as Opportunity[])
        setHasMore(refreshedData.hasMore)
        setTotalCount(refreshedData.totalCount)
        setCurrentPage(1)
      }
    } catch (error) {
      console.error("[OpportunitiesPage] Search error:", error)
      setSearchResults(null)
    } finally {
      setIsSearching(false)
    }
  }, 500)

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const result = await getOpportunities({ page: nextPage, pageSize: 50 })
      setOpportunities(prev => {
        const existingIds = new Set(prev.map(o => o.id))
        const newOnes = (result.opportunities as Opportunity[]).filter(o => !existingIds.has(o.id))
        return [...prev, ...newOnes]
      })
      setHasMore(result.hasMore)
      setTotalCount(result.totalCount)
      setCurrentPage(nextPage)
    } catch (error) {
      console.error("[OpportunitiesPage] Error loading more:", error)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, currentPage])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    performSearch(value, typeFilter)
  }

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value)
    if (searchQuery.trim()) {
      performSearch(searchQuery, value)
    }
  }

  const handleStatusChange = async (id: string, status: OpportunityStatus | null) => {
    // Optimistic update
    setStatuses(prev => {
      const next = { ...prev }
      if (status === null) delete next[id]
      else next[id] = status
      return next
    })

    try {
      await updateStatus(id, status)
    } catch (error) {
      console.error("Failed to update status:", error)
      // Revert on failure (could refetch)
    }
  }

  const displayedOpportunities = useMemo(() => {
    if (searchResults !== null) {
      return searchResults
    }

    // Use personalized list when toggle is on
    const sourceList = personalized && personalizedOpportunities.length > 0
      ? personalizedOpportunities
      : opportunities
    const normalizedQuery = searchQuery.toLowerCase()

    return sourceList.filter((opp) => {
      const matchesSearch =
        normalizedQuery === "" ||
        opp.title.toLowerCase().includes(normalizedQuery) ||
        opp.company.toLowerCase().includes(normalizedQuery) ||
        opp.skills.some((skill) => skill.toLowerCase().includes(normalizedQuery))

      const matchesType = typeFilter === "all" || opp.type.toLowerCase() === typeFilter.toLowerCase()

      return matchesSearch && matchesType
    })
  }, [opportunities, personalizedOpportunities, personalized, searchResults, searchQuery, typeFilter])

  const filteredOpportunities = displayedOpportunities
  const savedOpportunities = useMemo(() => opportunities.filter((o) => o.saved), [opportunities])

  const handleToggleSave = async (id: string) => {
    setOpportunities((prev) => prev.map((opp) => (opp.id === id ? { ...opp, saved: !opp.saved } : opp)))
    if (selectedOpportunity?.id === id) {
      setSelectedOpportunity((prev) => (prev ? { ...prev, saved: !prev.saved } : null))
    }
  }

  const handleSelectOpportunity = (opp: Opportunity) => {
    setSelectedOpportunity(opp)
  }

  const handleDiscoveryComplete = useCallback(
    async (count: number) => {
      // Discovery completed — don't auto-refresh, user will use Import button
    },
    []
  )

  const handleDiscoveryImport = useCallback(
    async (discoveredOpps: LiveOpportunity[]) => {
      // Fetch these opportunities from the database by ID and add to the list
      const ids = discoveredOpps.map(o => o.id).filter(Boolean)
      if (ids.length === 0) return

      try {
        const newOpportunities = await getOpportunitiesByIds(ids)
        const mapped = newOpportunities as Opportunity[]

        setOpportunities(prev => {
          const existingIds = new Set(prev.map(o => o.id))
          const existingTitles = new Set(prev.map(o => o.title.trim().toLowerCase()))
          const uniqueNew = mapped.filter(o =>
            !existingIds.has(o.id) && !existingTitles.has(o.title.trim().toLowerCase())
          )
          if (uniqueNew.length === 0) return prev
          return [...uniqueNew, ...prev]
        })

        // Also refresh personalized if active
        if (personalized) {
          fetchPersonalizedOpportunities()
        }
      } catch (error) {
        console.error("[OpportunitiesPage] Error importing discovered opportunities:", error)
      }
    },
    [personalized, fetchPersonalizedOpportunities]
  )

  const EmptyState = ({ type }: { type: "all" | "saved" | "applied" }) => {
    const configs = {
      all: {
        icon: Sparkles,
        title: "No opportunities found",
        description: "Try adjusting your search or filters to find more opportunities.",
      },
      saved: {
        icon: Bookmark,
        title: "No saved opportunities",
        description: "Save opportunities you're interested in to review them later.",
      },
      applied: {
        icon: Send,
        title: "No applications yet",
        description: "Start applying to opportunities to track your progress.",
      },
    }

    const config = configs[type]
    const Icon = config.icon

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">{config.title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{config.description}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 className="h-8 w-8 text-primary" />
          </motion.div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading opportunities...</p>
        </div>
      </div>
    )
  }

  return (
    <LayoutGroup>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-8 container mx-auto px-4 sm:px-6 max-w-7xl py-8"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <GlassCard
            variant="compact"
            className="p-4 sm:p-5 flex flex-col gap-5 sticky top-4 z-40 shadow-sm backdrop-blur-xl"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Opportunities</h1>
                <div className="text-muted-foreground text-sm flex items-center gap-2">
                  {isSearching ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="inline-flex text-primary"
                      >
                        <Loader2 className="h-3.5 w-3.5" />
                      </motion.span>
                      <span>Searching...</span>
                    </>
                  ) : personalized ? (
                    personalizedLoading ? (
                      <span>Finding your best matches...</span>
                    ) : (
                      <span>{filteredOpportunities.length} opportunities matched to your profile</span>
                    )
                  ) : (
                    <span>Showing {filteredOpportunities.length}{totalCount > filteredOpportunities.length ? ` of ${totalCount}` : ""} opportunities</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {/* Personalization Toggle */}
                <Button
                  variant={personalized ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!userProfileId) {
                      // No profile — redirect to profile page to set up interests
                      router.push("/profile")
                      return
                    }
                    if (personalized) {
                      setPersonalized(false)
                    } else {
                      setPersonalized(true)
                    }
                  }}
                  className={cn(
                    "gap-2 shrink-0 h-10 transition-all",
                    personalized
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "hover:border-primary/40"
                  )}
                >
                  {personalized ? (
                    <UserCheck className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  {personalized ? "For You" : "For You"}
                </Button>

                <div className="relative flex-1 md:w-80 group">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search opportunities..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 h-10 bg-muted/50 border-border/50 focus:bg-background focus:border-primary/20 transition-all rounded-lg"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-background/50"
                      onClick={() => handleSearchChange("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mask-fade-right">
            {CATEGORIES.map((cat) => {
              const value = cat === "All" ? "all" : cat.toLowerCase()
              const isActive = typeFilter.toLowerCase() === value

              return (
                <button
                  key={cat}
                  onClick={() => handleTypeFilterChange(value)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background/50 text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {discoveryStatus?.triggered && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-sm overflow-hidden"
            >
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <Globe className="h-5 w-5 text-primary" />
              </motion.div>
              <div className="flex-1">
                {discoveryStatus.newFound > 0 ? (
                  <span>
                    Searched the web and found <strong className="text-primary">{discoveryStatus.newFound}</strong> new{" "}
                    {discoveryStatus.newFound === 1 ? "opportunity" : "opportunities"}!
                  </span>
                ) : (
                  <span>Searched the web but no new opportunities matched your query.</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setDiscoveryStatus(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-w-0 mt-6">
          {hasMounted ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-muted/30 p-1 h-10 border border-border/40 backdrop-blur-sm">
                  <TabsTrigger
                    value="all"
                    className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Sparkles className="h-4 w-4" />
                    All <span className="opacity-60 text-xs ml-0.5">({filteredOpportunities.length})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="saved"
                    className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Bookmark className="h-4 w-4" />
                    Saved <span className="opacity-60 text-xs ml-0.5">({savedOpportunities.length})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="applied"
                    className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                    Applied <span className="opacity-60 text-xs ml-0.5">(3)</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="space-y-8 mt-0">
                <PerformanceErrorBoundary title="Discovery panel failed" message="Reload the page to restore AI discovery tools.">
                  <DiscoveryTriggerCard
                    initialQuery={searchQuery}
                    onComplete={handleDiscoveryComplete}
                    onImport={handleDiscoveryImport}
                    personalizedEnabled={personalizedDiscovery}
                    onPersonalizedChange={setPersonalizedDiscovery}
                    userProfileId={userProfileId}
                    existingOpportunityIds={existingOpportunityIds}
                    existingOpportunityTitles={existingOpportunityTitles}
                    compact={true}
                  />
                </PerformanceErrorBoundary>

                {/* Personalization info banner */}
                <AnimatePresence>
                  {personalized && !profileComplete && !personalizedLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm"
                    >
                      <UserCheck className="h-5 w-5 text-amber-500 shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium">Complete your profile to get personalized opportunities.</span>
                        <span className="text-muted-foreground ml-1">
                          Add your interests, career goals, and academic strengths in your profile settings.
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() => setPersonalized(false)}
                      >
                        Show all
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Loading state for personalized */}
                {personalized && personalizedLoading && (
                  <div className="flex items-center justify-center py-8 gap-3">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Matching opportunities to your profile...</span>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {filteredOpportunities.length === 0 ? (
                    personalized && !personalizedLoading && profileComplete ? (
                      <motion.div
                        key="no-personalized"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-16 text-center"
                      >
                        <div className="rounded-full bg-muted p-4 mb-4">
                          <UserCheck className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-1">No matching opportunities</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mb-4">
                          None of the current opportunities match your profile well enough. Try broadening your interests or switching to all opportunities.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setPersonalized(false)}>
                          <Users className="h-4 w-4 mr-2" />
                          Show all opportunities
                        </Button>
                      </motion.div>
                    ) : searchQuery || typeFilter !== "all" ? (
                      <motion.div
                        key="no-results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-12 text-muted-foreground"
                      >
                        No opportunities match your search.
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <EmptyState type="all" />
                      </motion.div>
                    )
                  ) : (
                    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <PerformanceErrorBoundary title="Opportunity list failed" message="Refresh to reload this opportunity section.">
                        <OpportunityList
                          opportunities={filteredOpportunities}
                          onToggleSave={handleToggleSave}
                          onSelect={handleSelectOpportunity}
                          selectedId={selectedOpportunity?.id}
                        />
                      </PerformanceErrorBoundary>
                      {hasMore && !searchResults && !personalized && (
                        <div className="flex justify-center pt-8 pb-4">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="gap-2 px-8"
                          >
                            {loadingMore ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              `Load more opportunities`
                            )}
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="saved" className="mt-0">
                <AnimatePresence mode="wait">
                  {savedOpportunities.length === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <EmptyState type="saved" />
                    </motion.div>
                  ) : (
                    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <PerformanceErrorBoundary title="Saved opportunities failed" message="Refresh to restore saved opportunity rendering.">
                        <OpportunityList
                          opportunities={savedOpportunities}
                          onToggleSave={handleToggleSave}
                          onSelect={handleSelectOpportunity}
                          selectedId={selectedOpportunity?.id}
                        />
                      </PerformanceErrorBoundary>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="applied" className="mt-0">
                <EmptyState type="applied" />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-6">
              <div className="h-10 w-full max-w-md bg-muted animate-pulse rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-72 w-full bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedOpportunity && (
            <PerformanceErrorBoundary title="Opportunity details failed" message="Close and reopen the details panel to retry.">
              <ExpandedOpportunityCard
                key={selectedOpportunity.id}
                opportunity={selectedOpportunity}
                onClose={() => setSelectedOpportunity(null)}
                onToggleSave={handleToggleSave}
                status={statuses[selectedOpportunity.id]}
                onStatusChange={(status) => handleStatusChange(selectedOpportunity.id, status)}
              />
            </PerformanceErrorBoundary>

          )}
        </AnimatePresence>

      </motion.div>
    </LayoutGroup>
  )
}
