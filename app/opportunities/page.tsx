"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Sparkles, Bookmark, Send, Filter, Loader2, Globe, X } from "lucide-react"
import { OpportunityList } from "@/components/opportunities/opportunity-list"
import { ExpandedOpportunityCard } from "@/components/opportunities/expanded-opportunity-card"
import { DiscoveryTriggerCard } from "@/components/opportunities/discovery-trigger-card"
import { getOpportunities, searchOpportunities } from "@/app/actions/opportunities"
import { getUserProfile } from "@/app/actions/user"
import { useHasMounted } from "@/hooks/use-has-mounted"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import type { Opportunity } from "@/types/opportunity"
import { OPPORTUNITY_TYPES } from "@/types/opportunity"

export default function OpportunitiesPage() {
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
  const searchParams = useSearchParams()

  const discoveredQueriesRef = useRef<Set<string>>(new Set())

  const mapOpportunity = useCallback((opp: any): Opportunity => ({
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
  }), [])

  useEffect(() => {
    async function fetchOpportunities() {
      const data = await getOpportunities()
      const mapped = data.map(mapOpportunity)
      setOpportunities(mapped)
      setLoading(false)

      const highlightId = searchParams.get('highlight')
      if (highlightId && mapped.length > 0) {
        const found = mapped.find((o: Opportunity) => o.id === highlightId)
        if (found) {
          setSelectedOpportunity(found)
        }
      }
    }
    fetchOpportunities()
  }, [searchParams, mapOpportunity])

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
  const savedOpportunities = useMemo(() => opportunities.filter(o => o.saved), [opportunities])

  const handleToggleSave = async (id: string) => {
    setOpportunities(opportunities.map((opp) => (opp.id === id ? { ...opp, saved: !opp.saved } : opp)))
    if (selectedOpportunity?.id === id) {
      setSelectedOpportunity(prev => prev ? { ...prev, saved: !prev.saved } : null)
    }
  }

  const handleSelectOpportunity = (opp: Opportunity) => {
    setSelectedOpportunity(opp)
  }

  const handleDiscoveryComplete = useCallback(async (count: number) => {
    if (count > 0) {
      const data = await getOpportunities()
      const mapped = data.map(mapOpportunity)
      setOpportunities(mapped)
    }
  }, [mapOpportunity])

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
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
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
        className="space-y-6 container mx-auto px-4 sm:px-6 max-w-7xl"
      >
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-40 bg-background/80 backdrop-blur-md py-4 -my-4 px-1"
        >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Opportunities</h1>
          <p className="text-muted-foreground">
            {isSearching ? (
              <span className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-3 w-3" />
                </motion.div>
                Searching...
              </span>
            ) : (
              `Discover ${filteredOpportunities.length} opportunities curated for you`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-muted/50 border-border/50 focus:bg-background transition-colors"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => handleSearchChange("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
            <SelectTrigger className="w-[160px] bg-muted/50 border-border/50">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {OPPORTUNITY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
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

      <div className="min-w-0">
        {hasMounted ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="all" className="gap-1.5 data-[state=active]:shadow-sm">
                <Sparkles className="h-4 w-4" />
                All ({filteredOpportunities.length})
              </TabsTrigger>
              <TabsTrigger value="saved" className="gap-1.5 data-[state=active]:shadow-sm">
                <Bookmark className="h-4 w-4" />
                Saved ({savedOpportunities.length})
              </TabsTrigger>
              <TabsTrigger value="applied" className="gap-1.5 data-[state=active]:shadow-sm">
                <Send className="h-4 w-4" />
                Applied (3)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6 space-y-8">
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
              
                <DiscoveryTriggerCard
                  initialQuery={searchQuery}
                  onComplete={handleDiscoveryComplete}
                  personalizedEnabled={personalizedDiscovery}
                  onPersonalizedChange={setPersonalizedDiscovery}
                  userProfileId={userProfileId}
                  className="mt-8"
                />
            </TabsContent>

            <TabsContent value="saved" className="mt-6">
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

            <TabsContent value="applied" className="mt-6">
              <EmptyState type="applied" />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            <div className="h-10 w-full max-w-md bg-muted animate-pulse rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
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
