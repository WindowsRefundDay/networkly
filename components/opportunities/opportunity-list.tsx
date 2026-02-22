"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { List, type RowComponentProps } from "react-window"
import { Button } from "@/components/ui/button"
import { Sparkles, Search, ArrowRight, Globe, TrendingUp, Zap } from "lucide-react"
import { OpportunityCard } from "@/components/opportunities/opportunity-card"
import { InlineDiscovery } from "@/components/discovery/inline-discovery"
import type { Opportunity } from "@/types/opportunity"

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.08,
    },
  },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 28,
    },
  },
}

const CARD_ROW_HEIGHT = 430
const VIRTUALIZATION_THRESHOLD = 18

type OpportunityPartitions = {
  featured: Opportunity[]
  recommended: Opportunity[]
  newest: Opportunity[]
}

function partitionOpportunities(opportunities: Opportunity[]): OpportunityPartitions {
  const featured: Opportunity[] = []
  const recommended: Opportunity[] = []
  const newest: Opportunity[] = []

  for (const opp of opportunities) {
    if (opp.matchScore >= 85 && featured.length < 3) {
      featured.push(opp)
      continue
    }

    if (opp.matchScore >= 60 && recommended.length < 6) {
      recommended.push(opp)
      continue
    }

    newest.push(opp)
  }

  return { featured, recommended, newest }
}

function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const update = () => setWidth(node.clientWidth)
    update()

    const observer = new ResizeObserver(() => update())
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

function getColumnCount(width: number): number {
  if (width >= 1280) return 3
  if (width >= 768) return 2
  return 1
}

interface VirtualizedRowsProps {
  items: Opportunity[]
  selectedId?: string
  onSelect: (opportunity: Opportunity) => void
  onToggleSave: (e: React.MouseEvent, id: string) => void
  savingIds: Set<string>
}

function VirtualizedOpportunityRows({
  items,
  selectedId,
  onSelect,
  onToggleSave,
  savingIds,
}: VirtualizedRowsProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>()
  const columnCount = getColumnCount(width)
  const rowCount = Math.ceil(items.length / columnCount)

  type RowData = {
    columnCount: number
    items: Opportunity[]
    onSelect: (opportunity: Opportunity) => void
    onToggleSave: (e: React.MouseEvent, id: string) => void
    savingIds: Set<string>
    selectedId?: string
  }

  const rowData = useMemo<RowData>(
    () => ({
      columnCount,
      items,
      onSelect,
      onToggleSave,
      savingIds,
      selectedId,
    }),
    [columnCount, items, onSelect, onToggleSave, savingIds, selectedId]
  )

  const Row = ({
    index,
    style,
    columnCount: rowColumnCount,
    items: rowItems,
    onSelect: rowOnSelect,
    onToggleSave: rowOnToggleSave,
    savingIds: rowSavingIds,
    selectedId: rowSelectedId,
  }: RowComponentProps<RowData>) => {
    const start = index * rowColumnCount
    const slice = rowItems.slice(start, start + rowColumnCount)

    return (
      <div style={style} className="px-0.5">
        <div
          className="grid gap-6 h-full"
          style={{ gridTemplateColumns: `repeat(${rowColumnCount}, minmax(0, 1fr))` }}
        >
          {slice.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              isSelected={rowSelectedId === opp.id}
              onSelect={rowOnSelect}
              onToggleSave={rowOnToggleSave}
              saving={rowSavingIds.has(opp.id)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <List
          rowComponent={Row}
          rowCount={rowCount}
          rowHeight={CARD_ROW_HEIGHT}
          rowProps={rowData}
          style={{
            height: Math.min(CARD_ROW_HEIGHT * 4, rowCount * CARD_ROW_HEIGHT),
            width,
          }}
          overscanCount={2}
        />
      )}
    </div>
  )
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

  const { featured, recommended, newest } = useMemo(
    () => partitionOpportunities(opportunities),
    [opportunities]
  )

  if (opportunities.length === 0 && !isSearching) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center mb-6 shadow-inner">
            <Sparkles className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <motion.div
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Search className="h-3 w-3 text-primary" />
          </motion.div>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No opportunities found</h3>
        <p className="text-muted-foreground max-w-sm mx-auto mb-6">
          {searchQuery
            ? `No cached results for "${searchQuery}". Want to search the web for new opportunities?`
            : "Try adjusting your filters or search query to find relevant opportunities."
          }
        </p>

        {searchQuery && searchQuery.length >= 3 && onSearchMore && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Button
              size="lg"
              className="gap-2 h-12 px-8 shadow-lg shadow-primary/20"
              onClick={() => onSearchMore(searchQuery)}
            >
              <Globe className="h-4 w-4" />
              Search Web for "{searchQuery}"
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    )
  }

  if (isSearching && searchQuery) {
    return (
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Globe className="h-5 w-5 text-primary" />
            </motion.div>
            Live Discovery
          </h2>
          <InlineDiscovery
            isActive={isSearching}
            query={searchQuery}
            onComplete={onSearchComplete || (() => {})}
            onNewOpportunity={onNewOpportunity}
          />
        </motion.section>

        {opportunities.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="pt-6 border-t border-border"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">Cached Results</h2>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
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
          </motion.section>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-20">
      {featured.length > 0 && (
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm backdrop-blur-sm">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight">Top Matches</h2>
                <p className="text-sm text-muted-foreground">Opportunities that best match your profile</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <TrendingUp className="h-3.5 w-3.5" />
              85%+ match score
            </div>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
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
        </motion.section>
      )}

      {recommended.length > 0 && (
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 shadow-sm backdrop-blur-sm">
              <Zap className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Recommended for You</h2>
              <p className="text-sm text-muted-foreground">Good opportunities based on your interests</p>
            </div>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
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
        </motion.section>
      )}

      {newest.length > 0 && (
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20 shadow-sm backdrop-blur-sm">
              <Search className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Browse All</h2>
              <p className="text-sm text-muted-foreground">{newest.length} more opportunities to explore</p>
            </div>
          </div>

          {newest.length > VIRTUALIZATION_THRESHOLD ? (
            <VirtualizedOpportunityRows
              items={newest}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggleSave={handleToggleSave}
              savingIds={savingIds}
            />
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
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
          )}
        </motion.section>
      )}

      {onSearchMore && searchQuery && searchQuery.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 28 }}
          className="flex flex-col items-center justify-center pt-8 border-t border-border"
        >
          <p className="text-muted-foreground mb-4">
            Showing {opportunities.length} results from our database
          </p>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
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
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
