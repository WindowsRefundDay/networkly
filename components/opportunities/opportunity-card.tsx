"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  MapPin, 
  Clock, 
  Calendar, 
  Globe, 
  GraduationCap, 
  Trophy,
  Zap,
  Bookmark,
  BookmarkCheck
} from "lucide-react"
import type { Opportunity } from "@/types/opportunity"
import { getTypeGradient, getMatchScoreColor, formatGradeLevels } from "@/types/opportunity"
import { getCompanyLogoUrl } from "@/lib/company-logo"

interface OpportunityCardProps {
  opportunity: Opportunity
  isSelected: boolean
  onSelect: (opportunity: Opportunity) => void
  onToggleSave: (e: React.MouseEvent, id: string) => void
  saving?: boolean
}

const cardSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 30,
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: cardSpring,
  },
}

export function OpportunityCard({ 
  opportunity, 
  isSelected, 
  onSelect, 
  onToggleSave,
  saving = false 
}: OpportunityCardProps) {
  const hasDeadline = opportunity.deadline && opportunity.deadline !== "Rolling"
  const hasPrizes = opportunity.prizes && opportunity.prizes.length > 0
  const isFree = opportunity.cost?.toLowerCase() === "free" || !opportunity.cost
  
  return (
    <motion.div
      variants={itemVariants}
      layoutId={`opportunity-${opportunity.id}`}
      className="h-full cursor-pointer group"
      onClick={() => onSelect(opportunity)}
    >
      <motion.div
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="h-full"
      >
        <Card 
          className={`
            relative h-full overflow-hidden border-border/50 
            transition-shadow duration-300 ease-out
            hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20
            ${isSelected 
              ? "ring-2 ring-primary border-primary shadow-lg shadow-primary/10" 
              : "bg-card/50 backdrop-blur-sm"
            }
          `}
        >
          <div className="relative">
            <div 
              className={`
                h-28 w-full bg-gradient-to-br ${getTypeGradient(opportunity.type)} 
                opacity-90 group-hover:opacity-100 transition-opacity duration-300
              `}
            >
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
            </div>
            
            <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
              {opportunity.isExpired && (
                <Badge variant="destructive" className="text-xs font-medium shadow-lg">
                  Expired
                </Badge>
              )}
              {!opportunity.isExpired && <div />}
              
              {hasPrizes && (
                <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white shadow-lg gap-1">
                  <Trophy className="h-3 w-3" />
                  Prizes
                </Badge>
              )}
            </div>
          </div>
          
          <div className="relative px-5 pb-5 -mt-10 z-20">
            <div className="flex justify-between items-end mb-4">
              <div className="rounded-xl border-4 border-card shadow-lg bg-card">
                <Avatar className="h-16 w-16 rounded-lg">
                  <AvatarImage 
                    src={opportunity.logo || getCompanyLogoUrl(opportunity.company) || undefined} 
                    alt={opportunity.company} 
                    className="object-cover [image-rendering:crisp-edges]" 
                  />
                  <AvatarFallback className="rounded-lg text-lg font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                    {opportunity.company[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex flex-col items-center">
                <div
                  className="relative"
                  role="img"
                  aria-label={`Match score: ${opportunity.matchScore}%`}
                >
                  <svg className="h-12 w-12 -rotate-90" aria-hidden="true">
                    <circle
                      className="text-muted/30"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="transparent"
                      r="20"
                      cx="24"
                      cy="24"
                    />
                    <motion.circle
                      className={getMatchScoreColor(opportunity.matchScore)}
                      strokeWidth="3"
                      strokeDasharray={126}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="20"
                      cx="24"
                      cy="24"
                      initial={{ strokeDashoffset: 126 }}
                      animate={{ strokeDashoffset: 126 - (126 * opportunity.matchScore) / 100 }}
                      transition={{ duration: 0.8, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-bold ${getMatchScoreColor(opportunity.matchScore)}`}>
                      {opportunity.matchScore}%
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground mt-0.5">match</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div>
                <h3 className="font-semibold text-base leading-snug text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2">
                  {opportunity.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <span className="truncate">{opportunity.company}</span>
                  {opportunity.remote && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                      <Globe className="h-2.5 w-2.5 mr-0.5" />
                      Remote
                    </Badge>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-muted/60 font-medium">
                  {opportunity.type}
                </Badge>
                {opportunity.category && opportunity.category !== "Other" && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-muted/60 font-medium">
                    {opportunity.category}
                  </Badge>
                )}
                {isFree && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    Free
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 truncate">
                  <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                  {opportunity.locationType || (opportunity.remote ? "Remote" : opportunity.location) || "Not specified"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 shrink-0 opacity-70" />
                  {hasDeadline ? opportunity.deadline : "Rolling"}
                </span>
                {opportunity.gradeLevels && opportunity.gradeLevels.length > 0 && (
                  <span className="flex items-center gap-1.5 truncate">
                    <GraduationCap className="h-3 w-3 shrink-0 opacity-70" />
                    {formatGradeLevels(opportunity.gradeLevels)}
                  </span>
                )}
                {opportunity.timeCommitment && (
                  <span className="flex items-center gap-1.5 truncate">
                    <Clock className="h-3 w-3 shrink-0 opacity-70" />
                    {opportunity.timeCommitment}
                  </span>
                )}
              </div>

              {opportunity.description && (
                <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
                  {opportunity.description}
                </p>
              )}

              {opportunity.skills && opportunity.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {opportunity.skills.slice(0, 3).map((skill) => (
                    <Badge 
                      key={skill} 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0 h-5 bg-muted/20 border-border/40 font-normal text-muted-foreground"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {opportunity.skills.length > 3 && (
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0 h-5 bg-muted/20 border-border/40 font-normal text-muted-foreground"
                    >
                      +{opportunity.skills.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button 
                size="sm"
                className="flex-1 h-9 text-xs font-medium shadow-sm gap-1.5"
                onClick={(e) => {
                  e.stopPropagation()
                  if (opportunity.url || opportunity.applicationUrl) {
                    window.open(opportunity.url || opportunity.applicationUrl || '', '_blank')
                  }
                }}
              >
                <Zap className="h-3.5 w-3.5" />
                Apply
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className={`h-9 w-9 shrink-0 transition-colors duration-200 ${
                  opportunity.saved 
                    ? "border-primary/50 text-primary bg-primary/5 hover:bg-primary/10" 
                    : "hover:bg-muted hover:border-muted-foreground/20"
                }`}
                onClick={(e) => onToggleSave(e, opportunity.id)}
                disabled={saving}
                aria-label={opportunity.saved ? "Remove from saved" : "Save opportunity"}
              >
                {opportunity.saved ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
