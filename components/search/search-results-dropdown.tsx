'use client'

import * as React from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  User,
  Briefcase,
  Calendar,
  FolderOpen,
  MapPin,
  Building2,
  ArrowRight,
  SearchX,
  Loader2,
  ChevronRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { 
  SearchResults, 
  SearchResultUser, 
  SearchResultProject, 
  SearchResultOpportunity, 
  SearchResultEvent 
} from '@/app/actions/search'

export interface SearchResultsDropdownProps {
  isOpen: boolean
  isLoading: boolean
  results: SearchResults | null
  onClose: () => void
  onSelectResult: (result: SearchResultUser | SearchResultProject | SearchResultOpportunity | SearchResultEvent) => void
  className?: string
}

type FlatResult = {
  type: 'user' | 'project' | 'opportunity' | 'event' | 'see-all'
  data?: any
  id: string
  group: string
}

const containerVariants: Variants = {
  hidden: { opacity: 0, y: -10, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 25,
      staggerChildren: 0.05
    }
  },
  exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2 } }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
}

export function SearchResultsDropdown({
  isOpen,
  isLoading,
  results,
  onClose,
  onSelectResult,
  className
}: SearchResultsDropdownProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const listRef = React.useRef<HTMLDivElement>(null)
  const router = useRouter()

  const flatResults = React.useMemo(() => {
    if (!results) return []
    const flat: FlatResult[] = []
    
    if (results.users.length > 0) {
      results.users.forEach(u => flat.push({ type: 'user', data: u, id: u.id, group: 'users' }))
    }
    if (results.projects.length > 0) {
      results.projects.forEach(p => flat.push({ type: 'project', data: p, id: p.id, group: 'projects' }))
    }
    if (results.opportunities.length > 0) {
      results.opportunities.forEach(o => flat.push({ type: 'opportunity', data: o, id: o.id, group: 'opportunities' }))
    }
    if (results.events.length > 0) {
      results.events.forEach(e => flat.push({ type: 'event', data: e, id: e.id, group: 'events' }))
    }
    
    return flat
  }, [results])

  React.useEffect(() => {
    setSelectedIndex(-1)
  }, [results, isOpen])

  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % flatResults.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + flatResults.length) % flatResults.length)
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && flatResults[selectedIndex]) {
            handleSelect(flatResults[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, flatResults, selectedIndex, onClose])

  React.useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  const handleSelect = (item: FlatResult) => {
    if (item.data) {
      onSelectResult(item.data)
      
      switch (item.type) {
        case 'user':
          router.push(`/profile/${item.data.id}`)
          break
        case 'project':
          router.push(`/projects/${item.data.id}`)
          break
        case 'opportunity':
          router.push(`/opportunities/${item.data.id}`)
          break
        case 'event':
          router.push(`/events/${item.data.id}`)
          break
      }
    }
    onClose()
  }

  if (!isOpen) return null

  const hasResults = results && (
    results.users.length > 0 || 
    results.projects.length > 0 || 
    results.opportunities.length > 0 || 
    results.events.length > 0
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
          className={cn(
            "absolute top-full left-0 z-50 mt-2 w-full min-w-[320px] sm:min-w-[400px] lg:min-w-[600px]",
            className
          )}
        >
          <GlassCard 
            variant="default" 
            className="overflow-hidden border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-xl"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm font-medium">Searching network...</p>
              </div>
            ) : !hasResults ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="rounded-full bg-muted/50 p-4 mb-3">
                  <SearchX className="h-8 w-8 text-muted-foreground/70" />
                </div>
                <p className="text-sm font-medium text-foreground">No results found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search terms</p>
              </div>
            ) : (
              <div ref={listRef} className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="flex flex-col gap-2 p-2">
                  
                  {results?.users.length! > 0 && (
                    <Section title="People" icon={<User className="h-4 w-4" />}>
                      {results?.users.map((user) => {
                        const globalIndex = flatResults.findIndex(r => r.id === user.id && r.type === 'user')
                        return (
                          <ResultItem
                            key={user.id}
                            index={globalIndex}
                            selectedIndex={selectedIndex}
                            onClick={() => handleSelect({ type: 'user', data: user, id: user.id, group: 'users' })}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-border/50">
                                <AvatarImage src={user.avatar || undefined} />
                                <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm truncate">{user.name}</span>
                                  {user.university && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1 rounded-sm border-primary/20 bg-primary/5 text-primary">
                                      {user.university}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{user.headline || "No headline"}</p>
                              </div>
                            </div>
                          </ResultItem>
                        )
                      })}
                    </Section>
                  )}

                  {results?.projects.length! > 0 && (
                    <Section title="Projects" icon={<FolderOpen className="h-4 w-4" />}>
                      {results?.projects.map((project) => {
                        const globalIndex = flatResults.findIndex(r => r.id === project.id && r.type === 'project')
                        return (
                          <ResultItem
                            key={project.id}
                            index={globalIndex}
                            selectedIndex={selectedIndex}
                            onClick={() => handleSelect({ type: 'project', data: project, id: project.id, group: 'projects' })}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                                <FolderOpen className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-semibold text-sm truncate">{project.title}</span>
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1 rounded-sm">
                                    {project.category}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                  <span>by {project.owner.name}</span>
                                </div>
                              </div>
                            </div>
                          </ResultItem>
                        )
                      })}
                    </Section>
                  )}

                  {results?.opportunities.length! > 0 && (
                    <Section title="Opportunities" icon={<Briefcase className="h-4 w-4" />}>
                      {results?.opportunities.map((opp) => {
                        const globalIndex = flatResults.findIndex(r => r.id === opp.id && r.type === 'opportunity')
                        return (
                          <ResultItem
                            key={opp.id}
                            index={globalIndex}
                            selectedIndex={selectedIndex}
                            onClick={() => handleSelect({ type: 'opportunity', data: opp, id: opp.id, group: 'opportunities' })}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 overflow-hidden">
                                {opp.logo ? (
                                  <img src={opp.logo} alt={opp.company} className="h-full w-full object-cover" />
                                ) : (
                                  <Building2 className="h-5 w-5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="font-semibold text-sm truncate">{opp.title}</span>
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{opp.opportunityType}</span>
                                </div>
                                <p className="text-xs font-medium text-foreground/80 truncate">{opp.company}</p>
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{opp.location}</span>
                                </div>
                              </div>
                            </div>
                          </ResultItem>
                        )
                      })}
                    </Section>
                  )}

                  {results?.events.length! > 0 && (
                    <Section title="Events" icon={<Calendar className="h-4 w-4" />}>
                      {results?.events.map((event) => {
                        const globalIndex = flatResults.findIndex(r => r.id === event.id && r.type === 'event')
                        return (
                          <ResultItem
                            key={event.id}
                            index={globalIndex}
                            selectedIndex={selectedIndex}
                            onClick={() => handleSelect({ type: 'event', data: event, id: event.id, group: 'events' })}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 font-bold leading-none border border-orange-500/20">
                                <span className="text-[9px] uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-sm">{new Date(event.date).getDate()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-sm truncate block">{event.title}</span>
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                                <Badge variant="outline" className="mt-1 text-[10px] h-4 px-1 border-orange-500/20 text-orange-600 bg-orange-500/5">
                                  {event.eventType}
                                </Badge>
                              </div>
                            </div>
                          </ResultItem>
                        )
                      })}
                    </Section>
                  )}
                  
                  <div className="p-2">
                    <button 
                      className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-muted/50"
                      onClick={() => {
                        router.push('/search')
                        onClose()
                      }}
                    >
                      <span>See all {results?.totalResults} results</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {icon}
        <span>{title}</span>
      </div>
      <div className="grid gap-1">
        {children}
      </div>
      <Separator className="mt-2 bg-border/40" />
    </div>
  )
}

function ResultItem({ 
  children, 
  onClick, 
  index,
  selectedIndex 
}: { 
  children: React.ReactNode
  onClick: () => void
  index: number
  selectedIndex: number
}) {
  const isSelected = index === selectedIndex
  
  return (
    <motion.button
      layout
      variants={itemVariants}
      data-index={index}
      onClick={onClick}
      className={cn(
        "relative w-full text-left p-3 rounded-lg transition-all duration-200 group outline-none",
        isSelected 
          ? "bg-primary/10 shadow-[0_0_0_1px_rgba(var(--primary),0.2)]" 
          : "hover:bg-muted/60"
      )}
    >
      {isSelected && (
        <motion.div
          layoutId="active-indicator"
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-l-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
      {children}
      <ChevronRight className={cn(
        "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 transition-transform duration-300",
        isSelected ? "translate-x-0 opacity-100 text-primary" : "translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
      )} />
    </motion.button>
  )
}
