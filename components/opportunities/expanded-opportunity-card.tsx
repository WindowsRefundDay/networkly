"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  X, 
  MapPin, 
  Clock, 
  Calendar, 
  DollarSign, 
  Globe, 
  CheckCircle2, 
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Share2,
  ExternalLink,
  GraduationCap,
  Trophy,
  Building,
  ArrowRight,
  type LucideIcon
} from "lucide-react"
import type { Opportunity } from "@/types/opportunity"
import { getTypeGradient, getMatchScoreColor, formatGradeLevels } from "@/types/opportunity"

interface ExpandedOpportunityCardProps {
  opportunity: Opportunity
  onClose: () => void
  onToggleSave: (id: string) => void
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" as const }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15, ease: "easeIn" as const }
  }
}

const cardVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.92,
    y: 20
  },
  visible: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { 
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      delay: 0.05
    }
  }
}

const contentVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30
    }
  }
}

function InfoBlock({ label, value, icon: Icon }: { label: string, value: string | null | undefined, icon: LucideIcon }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/30">
      <div className="p-2 rounded-lg bg-background shadow-sm shrink-0 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-foreground leading-snug">{value}</p>
      </div>
    </div>
  )
}

export function ExpandedOpportunityCard({ opportunity, onClose, onToggleSave }: ExpandedOpportunityCardProps) {
  const hasDeadline = opportunity.deadline && opportunity.deadline !== "Rolling"
  const isFree = opportunity.cost?.toLowerCase() === "free" || !opportunity.cost

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEscape)
    document.body.style.overflow = "hidden"
    
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <motion.div
          layoutId={`opportunity-${opportunity.id}`}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-4xl max-h-[90vh] bg-background rounded-2xl overflow-hidden shadow-2xl flex flex-col pointer-events-auto border border-border/50"
        >
          <div className="relative shrink-0">
            <div 
              className={`absolute inset-0 bg-gradient-to-br ${getTypeGradient(opportunity.type)} opacity-10`}
            />
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-20 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-start">
              <Avatar className="h-20 w-20 rounded-2xl border-4 border-background shadow-xl shrink-0">
                <AvatarImage src={opportunity.logo || "/placeholder.svg"} className="object-cover" />
                <AvatarFallback className="text-2xl font-bold bg-muted text-muted-foreground rounded-2xl">
                  {opportunity.company[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-background/60 backdrop-blur-sm border-border/50">
                    {opportunity.type}
                  </Badge>
                  {opportunity.remote && (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50">
                      <Globe className="h-3 w-3 mr-1" />
                      Remote
                    </Badge>
                  )}
                  <Badge variant="outline" className={`${getMatchScoreColor(opportunity.matchScore)} border-current bg-background/60`}>
                    {opportunity.matchScore}% Match
                  </Badge>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                  {opportunity.title}
                </h2>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-4 w-4" />
                  <span className="font-medium">{opportunity.company}</span>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto shrink-0">
                <Button 
                  size="lg" 
                  className="flex-1 sm:w-36 gap-2 shadow-lg shadow-primary/20" 
                  onClick={() => window.open(opportunity.url || opportunity.applicationUrl || '', '_blank')}
                >
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-11 w-11"
                    onClick={() => onToggleSave(opportunity.id)}
                  >
                    {opportunity.saved ? (
                      <BookmarkCheck className="h-5 w-5 text-primary" />
                    ) : (
                      <Bookmark className="h-5 w-5" />
                    )}
                  </Button>
                  <Button variant="outline" size="icon" className="h-11 w-11">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-muted/5">
            <motion.div 
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 space-y-6">
                {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
                  <motion.div 
                    variants={itemVariants}
                    className="bg-background rounded-xl p-5 shadow-sm border border-border/50 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Sparkles className="h-28 w-28" />
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <h3 className="font-semibold">AI Match Analysis</h3>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      {opportunity.matchReasons.map((reason, i) => (
                        <div key={i} className="flex items-start gap-2.5 bg-muted/40 p-3 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className="space-y-3">
                  <h3 className="text-lg font-bold">About this opportunity</h3>
                  <div className="prose prose-sm prose-gray dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {opportunity.description}
                  </div>
                </motion.div>

                {opportunity.requirements && (
                  <motion.div variants={itemVariants} className="space-y-3">
                    <h3 className="text-lg font-bold">Requirements</h3>
                    <div className="bg-background rounded-xl p-5 border border-border/50">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {opportunity.requirements}
                      </div>
                    </div>
                  </motion.div>
                )}

                {opportunity.skills && opportunity.skills.length > 0 && (
                  <motion.div variants={itemVariants} className="space-y-3">
                    <h3 className="text-lg font-bold">Skills & Technologies</h3>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="px-3 py-1.5 text-sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="space-y-5">
                <motion.div 
                  variants={itemVariants}
                  className="bg-background rounded-xl p-5 border border-border/50 shadow-sm space-y-3"
                >
                  <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3">
                    Logistics
                  </h3>
                  
                  <InfoBlock 
                    icon={Clock} 
                    label="Deadline" 
                    value={hasDeadline ? opportunity.deadline : "Rolling Admission"} 
                  />
                  
                  <InfoBlock 
                    icon={MapPin} 
                    label="Location" 
                    value={opportunity.locationType || (opportunity.remote ? "Remote" : opportunity.location)} 
                  />
                  
                  <InfoBlock 
                    icon={DollarSign} 
                    label="Cost / Salary" 
                    value={opportunity.salary || opportunity.cost || (isFree ? "Free" : null)} 
                  />
                  
                  <InfoBlock 
                    icon={Calendar} 
                    label="Duration" 
                    value={opportunity.duration} 
                  />

                  {opportunity.gradeLevels && opportunity.gradeLevels.length > 0 && (
                    <InfoBlock 
                      icon={GraduationCap} 
                      label="Eligibility" 
                      value={formatGradeLevels(opportunity.gradeLevels)} 
                    />
                  )}
                </motion.div>

                {opportunity.prizes && (
                  <motion.div 
                    variants={itemVariants}
                    className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-5 border border-amber-200/50 dark:border-amber-800/50"
                  >
                    <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-400 font-semibold">
                      <Trophy className="h-4 w-4" />
                      <h3>Prizes & Awards</h3>
                    </div>
                    <p className="text-sm text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                      {opportunity.prizes}
                    </p>
                  </motion.div>
                )}

                <motion.div 
                  variants={itemVariants}
                  className="bg-muted/30 rounded-xl p-5 border border-border/30 space-y-3 text-xs text-muted-foreground"
                >
                  <div className="flex justify-between items-center">
                    <span>Posted</span>
                    <span className="font-medium text-foreground">{opportunity.postedDate || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Applicants</span>
                    <span className="font-medium text-foreground">{opportunity.applicants || "—"}</span>
                  </div>
                  {opportunity.extractionConfidence !== undefined && opportunity.extractionConfidence !== null && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span>Data Confidence</span>
                        <span className="font-medium text-foreground">
                          {Math.round(opportunity.extractionConfidence * 100)}%
                        </span>
                      </div>
                      <Progress value={opportunity.extractionConfidence * 100} className="h-1.5" />
                    </div>
                  )}
                  
                  {opportunity.sourceUrl && (
                    <a 
                      href={opportunity.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline pt-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Original Source
                    </a>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </ScrollArea>
        </motion.div>
      </div>
    </>
  )
}
