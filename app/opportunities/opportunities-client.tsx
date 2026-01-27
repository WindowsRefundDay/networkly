"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Sparkles, Bookmark, Send, Filter, Loader2, Globe, X } from "lucide-react"
import { OpportunityList } from "@/components/opportunities/opportunity-list"
import { ExpandedOpportunityCard } from "@/components/opportunities/expanded-opportunity-card"
import { DiscoveryTriggerCard } from "@/components/opportunities/discovery-trigger-card"
import { getOpportunities, searchOpportunities, getOpportunitiesByIds } from "@/app/actions/opportunities"
import { getUserProfile } from "@/app/actions/user"
import { useHasMounted } from "@/hooks/use-has-mounted"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import type { Opportunity } from "@/types/opportunity"
import { OPPORTUNITY_TYPES } from "@/types/opportunity"

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
  const [searchResults, setSearchResults] = useState<Opportunity[] | null>(null)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [discoveryStatus, setDiscoveryStatus] = useState<{
    triggered: boolean
    newFound: number
  } | null>(null)
  const [userProfileId, setUserProfileId] = useState<string | undefined>()
  const [personalizedDiscovery, setPersonalizedDiscovery] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const hasMounted = useHasMounted()

  const discoveredQueriesRef = useRef<Set<string>>(new Set())
  const pendingOpportunityIds = useRef<Set<string>>(new Set())

  const fetchPendingOpportunities = useDebouncedCallback(async () => {
    if (pendingOpportunityIds.current.size === 0) return

    const idsToFetch = Array.from(pendingOpportunityIds.current)
    pendingOpportunityIds.current.clear()

    try {
      const newOpportunities = await getOpportunitiesByIds(idsToFetch)
      const mapped = newOpportunities.map(mapOpportunity)

      setOpportunities((prev) => {
        const existingIds = new Set(prev.map((o) => o.id))
        const uniqueNew = mapped.filter((o) => !existingIds.has(o.id))
        if (uniqueNew.length === 0) return prev
        return [...uniqueNew, ...prev]
      })

      if (searchResults) {
        setSearchResults((prev) => {
          if (!prev) return prev
          const existingIds = new Set(prev.map((o) => o.id))
          const uniqueNew = mapped.filter((o) => !existingIds.has(o.id))
          if (uniqueNew.length === 0) return prev
          return [...uniqueNew, ...prev]
        })
      }
    } catch (error) {
      console.error("[OpportunitiesPage] Error fetching live opportunities:", error)
    }
  }, 1000)

  const handleNewOpportunity = useCallback(
    (opportunity: { id: string }) => {
      pendingOpportunityIds.current.add(opportunity.id)
      fetchPendingOpportunities()
    },
    [fetchPendingOpportunities]
  )

  const mapOpportunity = useCallback(
    (opp: any): Opportunity => ({
      id: opp.id,
      title: opp.title,
      company: opp.company,
      location: opp.location,
      type: opp.type,
      matchScore: opp.matchScore || 0,
      matchReasons: opp.matchReasons || [],
      deadline: opp.deadline,
      postedDate: opp.postedDate,
      logo: opp.logo,
      skills: opp.skills || [],
      description: opp.description,
      salary: opp.salary,
      duration: opp.duration,
      remote: opp.remote || false,
      applicants: opp.applicants || 0,
      saved: opp.saved || false,
      category: opp.category,
      suggestedCategory: opp.suggestedCategory,
      gradeLevels: opp.gradeLevels,
      locationType: opp.locationType,
      startDate: opp.startDate,
      endDate: opp.endDate,
      cost: opp.cost,
      timeCommitment: opp.timeCommitment,
      prizes: opp.prizes,
      contactEmail: opp.contactEmail,
      applicationUrl: opp.applicationUrl,
      requirements: opp.requirements,
      sourceUrl: opp.sourceUrl,
      url: opp.url,
      timingType: opp.timingType,
      extractionConfidence: opp.extractionConfidence,
      isActive: opp.isActive,
      isExpired: opp.isExpired,
      lastVerified: opp.lastVerified,
      recheckAt: opp.recheckAt,
      nextCycleExpected: opp.nextCycleExpected,
      dateDiscovered: opp.dateDiscovered,
      createdAt: opp.createdAt,
      updatedAt: opp.updatedAt,
    }),
    []
  )

  useEffect(() => {
    async function fetchOpportunities() {
      try {
        const data = await getOpportunities()
        const mapped = data.map(mapOpportunity)
        setOpportunities(mapped)
        setLoading(false)

        if (initialHighlightId && mapped.length > 0) {
          const found = mapped.find((o: Opportunity) => o.id === initialHighlightId)
          if (found) {
            setSelectedOpportunity(found)
          }
        }
      } catch (error) {
        console.error("[OpportunitiesPage] Error fetching opportunities:", error)
        setOpportunities([])
        setLoading(false)
      }
    }
    fetchOpportunities()
  }, [mapOpportunity, initialHighlightId])

  // Fetch user profile for personalization
  useEffect(() => {
    async function fetchProfile() {
      try {
        const profile = await getUserProfile()
        if (profile?.id) {
          setUserProfileId(profile.id)
          // Default to enabled if profile exists
          setPersonalizedDiscovery(true)
        }
      } catch (error) {
        console.error("[OpportunitiesPage] Error fetching profile:", error)
      }
    }
    fetchProfile()
  }, [])

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

      const mapped = result.opportunities.map(mapOpportunity)
      setSearchResults(mapped)

      if (result.discoveryTriggered && !alreadyDiscovered) {
        discoveredQueriesRef.current.add(queryKey)
        setDiscoveryStatus({
          triggered: true,
          newFound: result.newOpportunitiesFound,
        })
      }

      if (result.newOpportunitiesFound > 0) {
        const refreshedData = await getOpportunities()
        setOpportunities(refreshedData.map(mapOpportunity))
      }
    } catch (error) {
      console.error("[OpportunitiesPage] Search error:", error)
      setSearchResults(null)
    } finally {
      setIsSearching(false)
    }
  }, 500)

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

  const displayedOpportunities = useMemo(() => {
    if (searchResults !== null) {
      return searchResults
    }

    return opportunities.filter((opp) => {
      const matchesSearch =
        searchQuery === "" ||
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesType = typeFilter === "all" || opp.type.toLowerCase() === typeFilter.toLowerCase()

      return matchesSearch && matchesType
    })
  }, [opportunities, searchResults, searchQuery, typeFilter])

  const filteredOpportunities = displayedOpportunities
  const savedOpportunities = useMemo(() => opportunities.filter((o) => o.saved), [opportunities])

  const handleToggleSave = async (id: string) => {
    setOpportunities(opportunities.map((opp) => (opp.id === id ? { ...opp, saved: !opp.saved } : opp)))
    if (selectedOpportunity?.id === id) {
      setSelectedOpportunity((prev) => (prev ? { ...prev, saved: !prev.saved } : null))
    }
  }

  const handleSelectOpportunity = (opp: Opportunity) => {
    setSelectedOpportunity(opp)
  }

  const handleDiscoveryComplete = useCallback(
    async (count: number) => {
      if (count > 0) {
        const data = await getOpportunities()
        const mapped = data.map(mapOpportunity)
        setOpportunities(mapped)
      }
    },
    [mapOpportunity]
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
                ) : (
                  <span>Discover {filteredOpportunities.length} opportunities curated for you</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
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
                <DiscoveryTriggerCard
                  initialQuery={searchQuery}
                  onComplete={handleDiscoveryComplete}
                  onNewOpportunity={handleNewOpportunity}
                  personalizedEnabled={personalizedDiscovery}
                  onPersonalizedChange={setPersonalizedDiscovery}
                  userProfileId={userProfileId}
                  compact={true}
                />

                <AnimatePresence mode="wait">
                  {filteredOpportunities.length === 0 ? (
                    searchQuery || typeFilter !== "all" ? (
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
                      <OpportunityList
                        opportunities={filteredOpportunities}
                        onToggleSave={handleToggleSave}
                        onSelect={handleSelectOpportunity}
                        selectedId={selectedOpportunity?.id}
                      />
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
                      <OpportunityList
                        opportunities={savedOpportunities}
                        onToggleSave={handleToggleSave}
                        onSelect={handleSelectOpportunity}
                        selectedId={selectedOpportunity?.id}
                      />
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
            <ExpandedOpportunityCard
              key={selectedOpportunity.id}
              opportunity={selectedOpportunity}
              onClose={() => setSelectedOpportunity(null)}
              onToggleSave={handleToggleSave}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  )
}
