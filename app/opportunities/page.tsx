"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Sparkles, Bookmark, Send, Filter, Loader2, Briefcase, Target } from "lucide-react"
import { OpportunityList } from "@/components/opportunities/opportunity-list"
import { OpportunityDetailPanel } from "@/components/opportunities/opportunity-detail-panel"
import { GoalDashboard } from "@/components/opportunities/goal-dashboard"
import { getOpportunities } from "@/app/actions/opportunities"
import { useHasMounted } from "@/hooks/use-has-mounted"

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

const OPPORTUNITY_TYPES = [
  { value: "internship", label: "Internship" },
  { value: "research", label: "Research" },
  { value: "competition", label: "Competition" },
  { value: "fellowship", label: "Fellowship" },
  { value: "program", label: "Program" },
]

export default function OpportunitiesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
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

      const matchesType = typeFilter === "all" || opp.type.toLowerCase() === typeFilter.toLowerCase()

      return matchesSearch && matchesType
    })
  }, [opportunities, searchQuery, typeFilter])

  const savedOpportunities = useMemo(() => opportunities.filter(o => o.saved), [opportunities])

  const handleToggleSave = async (id: string) => {
    setOpportunities(opportunities.map((opp) => (opp.id === id ? { ...opp, saved: !opp.saved } : opp)))
    if (selectedOpportunity?.id === id) {
      setSelectedOpportunity(prev => prev ? { ...prev, saved: !prev.saved } : null)
    }
  }

  const handleSelectOpportunity = (opp: Opportunity) => {
    setSelectedOpportunity(opp)
    setIsDetailOpen(true)
  }

  const EmptyState = ({ type }: { type: "all" | "saved" | "applied" }) => {
    const configs = {
      all: {
        icon: Briefcase,
        title: "No opportunities found",
        description: "Try adjusting your search or filters to find more opportunities.",
        action: null,
      },
      saved: {
        icon: Bookmark,
        title: "No saved opportunities",
        description: "Save opportunities you're interested in to review them later.",
        action: null,
      },
      applied: {
        icon: Send,
        title: "No applications yet",
        description: "Start applying to opportunities to track your progress.",
        action: null,
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
        {config.action}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - Matches Projects page layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Opportunities</h1>
          <p className="text-muted-foreground">Discover {filteredOpportunities.length} opportunities curated for you</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
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
      </div>

      {/* Main Grid Layout - Matches Projects page */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          {hasMounted ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">
                  <Sparkles className="h-4 w-4 mr-1" />
                  All ({filteredOpportunities.length})
                </TabsTrigger>
                <TabsTrigger value="saved">
                  <Bookmark className="h-4 w-4 mr-1" />
                  Saved ({savedOpportunities.length})
                </TabsTrigger>
                <TabsTrigger value="applied">
                  <Send className="h-4 w-4 mr-1" />
                  Applied (3)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                {filteredOpportunities.length === 0 ? (
                  searchQuery || typeFilter !== "all" ? (
                    <div className="text-center py-8 text-muted-foreground">No opportunities match your search.</div>
                  ) : (
                    <EmptyState type="all" />
                  )
                ) : (
                  <OpportunityList
                    opportunities={filteredOpportunities}
                    onToggleSave={handleToggleSave}
                    onSelect={handleSelectOpportunity}
                    selectedId={selectedOpportunity?.id}
                  />
                )}
              </TabsContent>

              <TabsContent value="saved" className="mt-6">
                {savedOpportunities.length === 0 ? (
                  <EmptyState type="saved" />
                ) : (
                  <OpportunityList
                    opportunities={savedOpportunities}
                    onToggleSave={handleToggleSave}
                    onSelect={handleSelectOpportunity}
                    selectedId={selectedOpportunity?.id}
                  />
                )}
              </TabsContent>

              <TabsContent value="applied" className="mt-6">
                <EmptyState type="applied" />
              </TabsContent>
            </Tabs>
          ) : (
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

        {/* Right Sidebar - Matches Projects page */}
        <div className="space-y-6">
          {selectedOpportunity ? (
            <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 max-h-[calc(100vh-12rem)]">
              <OpportunityDetailPanel
                opportunity={selectedOpportunity}
                isOpen={true}
                onClose={() => setSelectedOpportunity(null)}
                onToggleSave={handleToggleSave}
                embedded={true}
              />
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Goals Dashboard */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <GoalDashboard />
              </div>

              {/* Activity Stats */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Your Activity</h3>
                </div>
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
      <div className="lg:hidden">
        <OpportunityDetailPanel
          opportunity={selectedOpportunity}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onToggleSave={handleToggleSave}
        />
      </div>
    </div>
  )
}
