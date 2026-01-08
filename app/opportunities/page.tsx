"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Sparkles, SlidersHorizontal } from "lucide-react"
import { OpportunityFilters } from "@/components/opportunities/opportunity-filters"
import { OpportunityList } from "@/components/opportunities/opportunity-list"
import { OpportunityDetail } from "@/components/opportunities/opportunity-detail"
import { GoalDashboard } from "@/components/opportunities/goal-dashboard"
import { allOpportunities } from "@/lib/mock-data"

export default function OpportunitiesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [minMatchScore, setMinMatchScore] = useState(0)
  const [opportunities, setOpportunities] = useState(allOpportunities)
  const [selectedOpportunity, setSelectedOpportunity] = useState(allOpportunities[0])
  const [showFilters, setShowFilters] = useState(true)

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

  const handleToggleSave = (id: string) => {
    setOpportunities(opportunities.map((opp) => (opp.id === id ? { ...opp, saved: !opp.saved } : opp)))
  }

  const savedOpportunities = filteredOpportunities.filter((opp) => opp.saved)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Opportunity Discovery</h1>
          <p className="text-muted-foreground">AI-powered matching for internships, scholarships, and more</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="sm:hidden bg-transparent"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <GoalDashboard />

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All ({filteredOpportunities.length})</TabsTrigger>
          <TabsTrigger value="saved">Saved ({savedOpportunities.length})</TabsTrigger>
          <TabsTrigger value="applied">Applied (3)</TabsTrigger>
        </TabsList>

        <div className="grid gap-6 lg:grid-cols-4">
          <div className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <OpportunityFilters
              selectedTypes={selectedTypes}
              onTypesChange={setSelectedTypes}
              selectedLocations={selectedLocations}
              onLocationsChange={setSelectedLocations}
              minMatchScore={minMatchScore}
              onMatchScoreChange={setMinMatchScore}
            />
          </div>

          <TabsContent value="all" className="lg:col-span-2 m-0">
            <OpportunityList
              opportunities={filteredOpportunities}
              onToggleSave={handleToggleSave}
              onSelect={setSelectedOpportunity}
              selectedId={selectedOpportunity?.id}
            />
          </TabsContent>

          <TabsContent value="saved" className="lg:col-span-2 m-0">
            <OpportunityList
              opportunities={savedOpportunities}
              onToggleSave={handleToggleSave}
              onSelect={setSelectedOpportunity}
              selectedId={selectedOpportunity?.id}
            />
          </TabsContent>

          <TabsContent value="applied" className="lg:col-span-2 m-0">
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Your applied opportunities will appear here</p>
            </div>
          </TabsContent>

          <div className="hidden lg:block">
            {selectedOpportunity && (
              <OpportunityDetail opportunity={selectedOpportunity} onToggleSave={handleToggleSave} />
            )}
          </div>
        </div>
      </Tabs>
    </div>
  )
}
