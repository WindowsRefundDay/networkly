"use client"

import { useState, useEffect } from "react"
import { Drawer } from "vaul"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useMediaQuery } from "@/hooks/use-media-query"
import { 
  X, 
  ExternalLink, 
  MapPin, 
  Clock, 
  Users, 
  DollarSign, 
  Calendar, 
  Building,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Share2,
  Bookmark,
  BookmarkCheck,
  Zap
} from "lucide-react"

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

interface OpportunityDetailPanelProps {
  opportunity: Opportunity | null
  isOpen: boolean
  onClose: () => void
  onToggleSave: (id: string) => void
  /** When true, panel fills parent container instead of using fixed width */
  embedded?: boolean
}

export function OpportunityDetailPanel({ 
  opportunity, 
  isOpen, 
  onClose,
  onToggleSave,
  embedded = false
}: OpportunityDetailPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  
  if (!opportunity) return null

  const content = (
    <div className="h-full flex flex-col bg-background">
      {/* Header with Close Button */}
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Opportunity Details</h2>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {}}>
             <Share2 className="h-4 w-4" />
           </Button>
           <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onClose}>
             <X className="h-4 w-4" />
           </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Main Info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <Avatar className="h-20 w-20 rounded-xl border border-border shadow-sm">
                <AvatarImage src={opportunity.logo || "/placeholder.svg"} />
                <AvatarFallback className="text-2xl rounded-xl">{opportunity.company[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-end gap-2">
                 <Badge variant="outline" className="px-3 py-1 text-sm border-primary/20 bg-primary/5 text-primary">
                    {opportunity.matchScore}% Match
                 </Badge>
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-foreground leading-tight">{opportunity.title}</h1>
              <div className="flex items-center gap-2 mt-2 text-lg text-muted-foreground font-medium">
                <Building className="h-4 w-4" />
                {opportunity.company}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
               <Button className="flex-1 gap-2 shadow-sm">
                 <ExternalLink className="h-4 w-4" />
                 Apply Now
               </Button>
               <Button 
                 variant="outline" 
                 className={`gap-2 ${opportunity.saved ? "border-primary/50 text-primary bg-primary/5" : ""}`}
                 onClick={() => onToggleSave(opportunity.id)}
               >
                 {opportunity.saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                 {opportunity.saved ? "Saved" : "Save"}
               </Button>
            </div>
          </div>

          <Separator />

          {/* AI Insights - Replaces Goal Dashboard context */}
          <div className="rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 p-4 space-y-3">
             <div className="flex items-center gap-2 font-semibold text-foreground">
               <Sparkles className="h-4 w-4 text-primary" />
               AI Analysis
             </div>
             
             {/* Match Reasons */}
             {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
               <div className="space-y-2">
                 {opportunity.matchReasons.map((reason, i) => (
                   <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                     <CheckCircle2 className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                     <span>{reason}</span>
                   </div>
                 ))}
               </div>
             )}

             {/* Skill Gaps */}
             <div className="pt-2">
                <div className="flex items-center justify-between text-xs mb-1.5">
                   <span className="font-medium text-muted-foreground">Skill Match</span>
                   <span className="text-primary font-medium">4/5 Skills</span>
                </div>
                <Progress value={80} className="h-1.5 bg-primary/20" />
             </div>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                   <MapPin className="h-3 w-3" /> Location
                </span>
                <p className="text-sm font-medium">{opportunity.remote ? "Remote" : opportunity.location}</p>
             </div>
             <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                   <DollarSign className="h-3 w-3" /> Salary
                </span>
                <p className="text-sm font-medium">{opportunity.salary || "Competitive"}</p>
             </div>
             <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                   <Clock className="h-3 w-3" /> Deadline
                </span>
                <p className="text-sm font-medium">{opportunity.deadline || "Rolling"}</p>
             </div>
             <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                   <Users className="h-3 w-3" /> Applicants
                </span>
                <p className="text-sm font-medium">{opportunity.applicants} people</p>
             </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">About this role</h3>
            <div className="prose prose-sm dark:prose-invert text-muted-foreground leading-relaxed">
               <p>{opportunity.description || "No description available."}</p>
            </div>
          </div>

          {/* Skills Tags */}
          <div className="space-y-3">
             <h3 className="font-semibold text-sm">Required Skills</h3>
             <div className="flex flex-wrap gap-2">
                {opportunity.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="px-2 py-1 bg-muted/50 text-muted-foreground hover:bg-muted">
                    {skill}
                  </Badge>
                ))}
             </div>
          </div>
        </div>
      </ScrollArea>
      
      {/* Sticky Bottom Action (Mobile Only) */}
      <div className="p-4 border-t lg:hidden bg-background">
         <Button className="w-full gap-2 text-lg h-12">
            <Zap className="h-5 w-5 fill-current" />
            Quick Apply
         </Button>
      </div>
    </div>
  )

  if (isDesktop) {
    // When embedded, fill parent container; otherwise use fixed width for standalone
    if (embedded) {
      return (
        <div className="w-full h-full flex flex-col">
          {content}
        </div>
      )
    }
    return (
      <div className="w-[400px] xl:w-[450px] border-l border-border bg-card h-[calc(100vh-4rem)] sticky top-16 flex flex-col shadow-sm">
        {content}
      </div>
    )
  }

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[92vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t outline-none">
          <div className="p-4 bg-background rounded-t-[10px] flex-1 overflow-hidden">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-6" />
            <div className="h-full -mt-4">
              {content}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
