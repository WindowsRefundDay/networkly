"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OpportunityFilters } from "@/components/opportunities/opportunity-filters"
import { OpportunityList } from "@/components/opportunities/opportunity-list"
import { OpportunityDetailPanel } from "@/components/opportunities/opportunity-detail-panel"
import { GoalDashboard } from "@/components/opportunities/goal-dashboard"
import { SearchWithDiscovery } from "@/components/opportunities/search-with-discovery"
import { LiveOpportunitiesFeed } from "@/components/discovery/live-opportunities-feed"
import { getOpportunities } from "@/app/actions/opportunities"
import { useHasMounted } from "@/hooks/use-has-mounted"
import { toast } from "sonner"

interface Opportunity {
  id: string
  title: string
  company: string
  location: string
  type: string
  matchScore: number
  matchReasons?: string[]
  deadline: string | null
  postedDate: string
  logo: string | null
  skills: string[]
  description: string | null
  salary: string | null
  duration: string | null
  remote: boolean
  applicants: number
  saved: boolean
}

export default function OpportunitiesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [minMatchScore, setMinMatchScore] = useState(0)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [liveOpportunities, setLiveOpportunities] = useState<any[]>([])
  const hasMounted = useHasMounted()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function fetchOpportunities() {
      const data = await getOpportunities()
      const mapped = data.map((opp: any) => ({
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
      }))
      setOpportunities(mapped)
      setLoading(false)

      // Handle highlight param from AI assistant "View" button
      const highlightId = searchParams.get('highlight')
      if (highlightId && mapped.length > 0) {
        const found = mapped.find((o: Opportunity) => o.id === highlightId)
        if (found) {
          setSelectedOpportunity(found)
          setIsDetailOpen(true)
        }
      }
    }
    fetchOpportunities()
  }, [searchParams])

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      const matchesSearch =
        searchQuery === "" ||
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(opp.type)
      const matchesLocation =
        selectedLocations.length === 0 ||
        selectedLocations.includes(opp.location) ||
        (selectedLocations.includes("Remote") && opp.remote)
      const matchesScore = opp.matchScore >= minMatchScore

      return matchesSearch && matchesType && matchesLocation && matchesScore
    })
  }, [opportunities, searchQuery, selectedTypes, selectedLocations, minMatchScore])

  const handleToggleSave = async (id: string) => {
    // Optimistic
    setOpportunities(opportunities.map((opp) => (opp.id === id ? { ...opp, saved: !opp.saved } : opp)))
    if (selectedOpportunity?.id === id) {
      setSelectedOpportunity(prev => prev ? { ...prev, saved: !prev.saved } : null)
    }
  }

  const handleSearchMore = (query: string) => {
    if (!query || query.length < 3) return
    setIsSearching(true)
  }

  const handleSearchComplete = async () => {
    setIsSearching(false)
    // Refresh data logic would go here
  }

  const handleNewOpportunity = (card: { title: string; organization: string; type: string; location?: string }) => {
    // Logic to add new opp
    const newOpp: Opportunity = {
      id: `temp-${Date.now()}`,
      title: card.title,
      company: card.organization,
      type: card.type,
      location: card.location || "Remote",
      matchScore: 0,
      skills: [],
      matchReasons: [],
      deadline: null,
      postedDate: "Just now",
      logo: null,
      description: "Newly discovered opportunity.",
      salary: null,
      duration: null,
      remote: false,
      applicants: 0,
      saved: false
    }
    setOpportunities(prev => [newOpp, ...prev])
  }

  const handleSelectOpportunity = (opp: Opportunity) => {
    setSelectedOpportunity(opp)
    setIsDetailOpen(true)
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="container mx-auto px-4 lg:px-8 py-6 max-w-[1600px]">

        {/* Header */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Opportunities</h1>
              <p className="text-muted-foreground mt-1 text-lg">
                Discover {filteredOpportunities.length} opportunities curated for you
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <SearchWithDiscovery
                value={searchQuery}
                onChange={setSearchQuery}
                onTriggerSearch={handleSearchMore}
                isSearching={isSearching}
                className="flex-1 sm:w-[320px]"
              />
              <OpportunityFilters
                selectedTypes={selectedTypes}
                onTypesChange={setSelectedTypes}
                selectedLocations={selectedLocations}
                onLocationsChange={setSelectedLocations}
                minMatchScore={minMatchScore}
                onMatchScoreChange={setMinMatchScore}
              />
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex items-start gap-8 relative">

          {/* Main Grid Content */}
          <div className="flex-1 min-w-0">
            {hasMounted ? (
              <Tabs defaultValue="all" className="space-y-6">
                <TabsList className="bg-muted/50 p-1">
                  <TabsTrigger value="all" className="px-6">All ({filteredOpportunities.length})</TabsTrigger>
                  <TabsTrigger value="saved" className="px-6">Saved ({opportunities.filter(o => o.saved).length})</TabsTrigger>
                  <TabsTrigger value="applied" className="px-6">Applied (3)</TabsTrigger>
                </TabsList>

                {/* ✨ Live Opportunities Feed */}
                {liveOpportunities.length > 0 && (
                  <div className="mt-6">
                    <LiveOpportunitiesFeed opportunities={liveOpportunities} />
                  </div>
                )}

                <TabsContent value="all" className="mt-6">
                  <OpportunityList
                    opportunities={filteredOpportunities}
                    onToggleSave={handleToggleSave}
                    onSelect={handleSelectOpportunity}
                    selectedId={selectedOpportunity?.id}
                    searchQuery={searchQuery}
                    onSearchMore={handleSearchMore}
                    isSearching={isSearching}
                    onSearchComplete={handleSearchComplete}
                    onNewOpportunity={handleNewOpportunity}
                  />
                </TabsContent>

                <TabsContent value="saved" className="mt-6">
                  <OpportunityList
                    opportunities={opportunities.filter(o => o.saved)}
                    onToggleSave={handleToggleSave}
                    onSelect={handleSelectOpportunity}
                    selectedId={selectedOpportunity?.id}
                  />
                </TabsContent>

                <TabsContent value="applied" className="mt-6">
                  {/* Placeholder for applied */}
                  <div className="text-center py-20 text-muted-foreground">
                    No applications yet. Start applying!
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              /* Skeleton or Loader to prevent layout shift */
              <div className="space-y-6">
                <div className="h-10 w-full max-w-md bg-muted animate-pulse rounded-lg" />
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-40 w-full bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar (Detail Panel or Dashboard) */}
          <div className="hidden xl:block w-[420px] shrink-0 sticky top-6 space-y-6">
            {/* If an opportunity is selected, show detail panel */}
            {selectedOpportunity ? (
              <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 max-h-[calc(100vh-6rem)]">
                {/* We reuse the panel content here logic or just render the component slightly differently */}
                <OpportunityDetailPanel
                  opportunity={selectedOpportunity}
                  isOpen={true} // Always open in desktop sidebar mode
                  onClose={() => setSelectedOpportunity(null)}
                  onToggleSave={handleToggleSave}
                  embedded={true}
                />
              </div>
            ) : (
              /* Default Dashboard View when no selection */
              <div className="space-y-6 animate-in fade-in duration-500">
                <GoalDashboard />

                {/* Stats Widget */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-semibold mb-4">Your Activity</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Applications Sent</span>
                      <span className="font-bold">12</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Profile Views</span>
                      <span className="font-bold">48</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Response Rate</span>
                      <span className="font-bold text-emerald-500">15%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile/Tablet Detail Drawer */}
        <div className="xl:hidden">
          <OpportunityDetailPanel
            opportunity={selectedOpportunity}
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            onToggleSave={handleToggleSave}
          />
        </div>

      </div>
    </div>
  )
}
