"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sparkles, Search, ArrowRight, Globe } from "lucide-react"
import { OpportunityCard } from "@/components/opportunities/opportunity-card"
import { InlineDiscovery } from "@/components/discovery/inline-discovery"

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

interface OpportunityListProps {
  opportunities: Opportunity[]
  onToggleSave: (id: string) => void
  onSelect: (opportunity: Opportunity) => void
  selectedId?: string
  searchQuery?: string
  onSearchMore?: (query: string) => void
  isSearching?: boolean
  onSearchComplete?: () => void
  onNewOpportunity?: (card: { title: string; organization: string; type: string; location?: string }) => void
}

export function OpportunityList({
  opportunities,
  onToggleSave,
  onSelect,
  selectedId,
  searchQuery,
  onSearchMore,
  isSearching,
  onSearchComplete,
  onNewOpportunity
}: OpportunityListProps) {
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  const handleToggleSave = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSavingIds(prev => new Set(prev).add(id))
    await onToggleSave(id)
    setSavingIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // Group opportunities
  const featured = opportunities.filter(o => o.matchScore >= 85).slice(0, 3)
  const recommended = opportunities.filter(o => o.matchScore >= 60 && o.matchScore < 85 && !featured.find(f => f.id === o.id)).slice(0, 6)
  const newest = opportunities.filter(o => !featured.find(f => f.id === o.id) && !recommended.find(r => r.id === o.id))

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  // Empty state with search option
  if (opportunities.length === 0 && !isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
          <Sparkles className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No opportunities found</h3>
        <p className="text-muted-foreground max-w-sm mx-auto mb-6">
          {searchQuery 
            ? `No cached results for "${searchQuery}". Want to search the web for new opportunities?`
            : "Try adjusting your filters or search query to find relevant opportunities."
          }
        </p>
        
        {/* Show search button when there's a query */}
        {searchQuery && searchQuery.length >= 3 && onSearchMore && (
          <Button 
            size="lg" 
            className="gap-2 h-12 px-8"
            onClick={() => onSearchMore(searchQuery)}
          >
            <Globe className="h-4 w-4" />
            Search Web for "{searchQuery}"
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    )
  }

  // Searching state - show inline discovery
  if (isSearching && searchQuery) {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary animate-pulse" />
            Live Discovery
          </h2>
          <InlineDiscovery
            isActive={isSearching}
            query={searchQuery}
            onComplete={onSearchComplete || (() => {})}
            onNewOpportunity={onNewOpportunity}
          />
        </section>
        
        {/* Show existing results below if any */}
        {opportunities.length > 0 && (
          <section className="pt-6 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Cached Results</h2>
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {opportunities.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  isSelected={selectedId === opp.id}
                  onSelect={onSelect}
                  onToggleSave={handleToggleSave}
                  saving={savingIds.has(opp.id)}
                />
              ))}
            </motion.div>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-20">
      
      {/* Featured Section - Only show if high matches exist */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
               <Sparkles className="h-5 w-5 text-amber-500" />
               Top Matches for You
             </h2>
          </div>
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {featured.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                isSelected={selectedId === opp.id}
                onSelect={onSelect}
                onToggleSave={handleToggleSave}
                saving={savingIds.has(opp.id)}
              />
            ))}
          </motion.div>
        </section>
      )}

      {/* Recommended Section */}
      {recommended.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Recommended for You</h2>
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {recommended.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                isSelected={selectedId === opp.id}
                onSelect={onSelect}
                onToggleSave={handleToggleSave}
                saving={savingIds.has(opp.id)}
              />
            ))}
          </motion.div>
        </section>
      )}

      {/* Newest / Remaining */}
      {newest.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Newest Opportunities</h2>
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {newest.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                isSelected={selectedId === opp.id}
                onSelect={onSelect}
                onToggleSave={handleToggleSave}
                saving={savingIds.has(opp.id)}
              />
            ))}
          </motion.div>
        </section>
      )}

      {/* Load More Action - Show when there are results and a search query */}
      {onSearchMore && searchQuery && searchQuery.length >= 3 && (
        <div className="flex flex-col items-center justify-center pt-8 border-t border-border">
          <p className="text-muted-foreground mb-4">
            Showing {opportunities.length} results from our database
          </p>
          <Button 
            variant="outline" 
            size="lg" 
            className="gap-2 h-12 px-8"
            onClick={() => onSearchMore(searchQuery)}
          >
            <Search className="h-4 w-4" />
            Scan Web for More Matches
            <ArrowRight className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </div>
      )}
    </div>
  )
}
