"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Drawer } from "vaul"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
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
  Share2,
  Bookmark,
  BookmarkCheck,
  Zap,
  Tag,
  Link2,
  RefreshCw,
  Timer,
  FileText,
  Globe,
  Info,
  GraduationCap,
  Mail,
  Trophy,
  CalendarDays,
  CalendarClock,
  Shield,
  Target,
  TrendingUp,
  AlertCircle,
  CircleDollarSign
} from "lucide-react"
import type { Opportunity } from "@/types/opportunity"
import { getTypeGradient, getMatchScoreColor, getMatchScoreBgColor, formatGradeLevels } from "@/types/opportunity"

interface OpportunityDetailPanelProps {
  opportunity: Opportunity | null
  isOpen: boolean
  onClose: () => void
  onToggleSave: (id: string) => void
  embedded?: boolean
}

function InfoItem({ 
  icon: Icon, 
  label, 
  value, 
  className = "" 
}: { 
  icon: React.ElementType
  label: string
  value: React.ReactNode
  className?: string 
}) {
  if (!value) return null
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="p-2 rounded-lg bg-muted/50 shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

function Section({ 
  title, 
  icon: Icon, 
  children, 
  className = "" 
}: { 
  title: string
  icon?: React.ElementType
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </h3>
      {children}
    </div>
  )
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

  const hasDeadline = opportunity.deadline && opportunity.deadline !== "Rolling"
  const hasPrizes = opportunity.prizes && opportunity.prizes.length > 0
  const hasDateRange = opportunity.startDate || opportunity.endDate
  const isFree = opportunity.cost?.toLowerCase() === "free" || !opportunity.cost
  const matchedSkillsCount = Math.min(opportunity.skills?.length || 0, 5)
  const totalSkills = opportunity.skills?.length || 0

  const content = (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-background"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-background/95 backdrop-blur-md z-10">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Opportunity Details
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden hover:bg-muted" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6">
          <div className={`-mx-5 -mt-5 mb-2 h-24 bg-gradient-to-br ${getTypeGradient(opportunity.type)} relative overflow-hidden`}>
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
            
            {opportunity.isExpired && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-3 left-3"
              >
                <Badge variant="destructive" className="text-xs font-medium shadow-lg gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Expired
                </Badge>
              </motion.div>
            )}
          </div>

          <div className="flex items-start gap-4 -mt-14 relative z-10">
            <Avatar className="h-18 w-18 rounded-xl border-4 border-background shadow-xl bg-background">
              <AvatarImage src={opportunity.logo || "/placeholder.svg"} className="object-cover" />
              <AvatarFallback className="text-xl font-bold rounded-xl bg-gradient-to-br from-muted to-muted/50">
                {opportunity.company[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pt-10">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-foreground leading-snug">
                    {opportunity.title}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <Building className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{opportunity.company}</span>
                  </div>
                </div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Badge 
                    variant="outline" 
                    className={`shrink-0 px-2.5 py-1 text-sm font-bold border ${getMatchScoreBgColor(opportunity.matchScore)} ${getMatchScoreColor(opportunity.matchScore)}`}
                  >
                    {opportunity.matchScore}%
                  </Badge>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-muted/70 font-medium">
              {opportunity.type}
            </Badge>
            {opportunity.category && opportunity.category !== "Other" && (
              <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-muted/70 font-medium">
                {opportunity.category}
              </Badge>
            )}
            {opportunity.remote && (
              <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium gap-1">
                <Globe className="h-3 w-3" />
                Remote
              </Badge>
            )}
            {isFree && (
              <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                Free
              </Badge>
            )}
            {hasPrizes && (
              <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium gap-1">
                <Trophy className="h-3 w-3" />
                Prizes
              </Badge>
            )}
            {opportunity.timingType && opportunity.timingType !== "one-time" && (
              <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium capitalize">
                {opportunity.timingType.replace("-", " ")}
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              className="flex-1 gap-2 shadow-md hover:shadow-lg transition-shadow" 
              size="sm"
              onClick={() => {
                const url = opportunity.url || opportunity.applicationUrl
                if (url) window.open(url, '_blank')
              }}
              disabled={!opportunity.url && !opportunity.applicationUrl}
            >
              <Zap className="h-4 w-4" />
              Apply Now
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className={`gap-2 transition-all ${opportunity.saved ? "border-primary/50 text-primary bg-primary/5 hover:bg-primary/10" : ""}`}
              onClick={() => onToggleSave(opportunity.id)}
            >
              {opportunity.saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {opportunity.saved ? "Saved" : "Save"}
            </Button>
          </div>

          {(opportunity.matchReasons && opportunity.matchReasons.length > 0) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-gradient-to-br from-primary/5 via-primary/3 to-secondary/5 border border-primary/10 p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-sm text-foreground">Why This Matches You</span>
              </div>
              
              <div className="space-y-2">
                {opportunity.matchReasons.map((reason, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </motion.div>
                ))}
              </div>

              {totalSkills > 0 && (
                <div className="pt-3 border-t border-primary/10">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-muted-foreground">Skill Match</span>
                    <span className="text-primary font-semibold">{matchedSkillsCount}/{totalSkills} Skills</span>
                  </div>
                  <Progress 
                    value={totalSkills > 0 ? (matchedSkillsCount / totalSkills) * 100 : 0} 
                    className="h-2 bg-primary/20" 
                  />
                </div>
              )}
            </motion.div>
          )}

          <Section title="Quick Info" icon={Info}>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem 
                  icon={MapPin} 
                  label="Location" 
                  value={opportunity.locationType || (opportunity.remote ? "Remote" : opportunity.location) || "Not specified"} 
                />
                <InfoItem 
                  icon={Calendar} 
                  label="Deadline" 
                  value={hasDeadline ? opportunity.deadline : "Rolling Basis"} 
                />
                <InfoItem 
                  icon={CircleDollarSign} 
                  label="Cost" 
                  value={opportunity.cost || "Free"} 
                />
                <InfoItem 
                  icon={DollarSign} 
                  label="Compensation" 
                  value={opportunity.salary} 
                />
                <InfoItem 
                  icon={Timer} 
                  label="Duration" 
                  value={opportunity.duration} 
                />
                <InfoItem 
                  icon={Clock} 
                  label="Time Commitment" 
                  value={opportunity.timeCommitment} 
                />
                <InfoItem 
                  icon={Users} 
                  label="Applicants" 
                  value={opportunity.applicants ? `${opportunity.applicants} ${opportunity.applicants === 1 ? "person" : "people"}` : null} 
                />
                <InfoItem 
                  icon={GraduationCap} 
                  label="Grade Levels" 
                  value={opportunity.gradeLevels && opportunity.gradeLevels.length > 0 ? formatGradeLevels(opportunity.gradeLevels) : null} 
                />
              </div>
            </div>
          </Section>

          {hasDateRange && (
            <Section title="Schedule" icon={CalendarDays}>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem 
                    icon={CalendarClock} 
                    label="Start Date" 
                    value={opportunity.startDate ? new Date(opportunity.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null} 
                  />
                  <InfoItem 
                    icon={CalendarClock} 
                    label="End Date" 
                    value={opportunity.endDate ? new Date(opportunity.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null} 
                  />
                </div>
              </div>
            </Section>
          )}

          {hasPrizes && (
            <Section title="Prizes & Awards" icon={Trophy}>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{opportunity.prizes}</p>
              </div>
            </Section>
          )}

          {opportunity.description && (
            <Section title="About This Opportunity" icon={FileText}>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {opportunity.description}
              </div>
            </Section>
          )}

          {opportunity.requirements && (
            <Section title="Requirements" icon={CheckCircle2}>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {opportunity.requirements}
              </div>
            </Section>
          )}

          {opportunity.skills && opportunity.skills.length > 0 && (
            <Section title="Skills & Tags" icon={Tag}>
              <div className="flex flex-wrap gap-1.5">
                {opportunity.skills.map((skill) => (
                  <Badge 
                    key={skill} 
                    variant="secondary" 
                    className="px-2.5 py-1 text-xs font-medium bg-muted/60 hover:bg-muted transition-colors"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          <Section title="Additional Details" icon={Shield}>
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Posted</span>
                <span className="font-medium text-foreground">{opportunity.postedDate || "Unknown"}</span>
              </div>
              
              {opportunity.dateDiscovered && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discovered</span>
                  <span className="font-medium text-foreground">
                    {new Date(opportunity.dateDiscovered).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}

              {opportunity.lastVerified && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Verified</span>
                  <span className="font-medium text-foreground">
                    {new Date(opportunity.lastVerified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}

              {opportunity.nextCycleExpected && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Next Cycle</span>
                  <span className="font-medium text-foreground">
                    {new Date(opportunity.nextCycleExpected).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}

              {opportunity.extractionConfidence !== undefined && opportunity.extractionConfidence > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Data Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${opportunity.extractionConfidence * 100}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      />
                    </div>
                    <span className="font-medium text-foreground text-xs w-8">
                      {Math.round(opportunity.extractionConfidence * 100)}%
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge 
                  variant={opportunity.isActive ? "secondary" : "outline"} 
                  className={`text-xs ${opportunity.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : ""}`}
                >
                  {opportunity.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </Section>

          {opportunity.contactEmail && (
            <Section title="Contact" icon={Mail}>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={() => window.open(`mailto:${opportunity.contactEmail}`, '_blank')}
              >
                <Mail className="h-4 w-4" />
                {opportunity.contactEmail}
              </Button>
            </Section>
          )}

          {(opportunity.url || opportunity.applicationUrl || opportunity.sourceUrl) && (
            <Section title="Links" icon={Link2}>
              <div className="space-y-2">
                {(opportunity.url || opportunity.applicationUrl) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start gap-2"
                    onClick={() => window.open(opportunity.url || opportunity.applicationUrl || '', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Application Page
                  </Button>
                )}
                {opportunity.sourceUrl && opportunity.sourceUrl !== opportunity.url && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start gap-2 text-muted-foreground"
                    onClick={() => window.open(opportunity.sourceUrl || '', '_blank')}
                  >
                    <Link2 className="h-4 w-4" />
                    View Source
                  </Button>
                )}
              </div>
            </Section>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t lg:hidden bg-background/95 backdrop-blur-md">
        <Button 
          className="w-full gap-2 h-12 shadow-lg" 
          size="lg"
          onClick={() => {
            const url = opportunity.url || opportunity.applicationUrl
            if (url) window.open(url, '_blank')
          }}
          disabled={!opportunity.url && !opportunity.applicationUrl}
        >
          <Zap className="h-5 w-5" />
          Quick Apply
        </Button>
      </div>
    </motion.div>
  )

  if (isDesktop) {
    if (embedded) {
      return (
        <div className="w-full h-full flex flex-col">
          {content}
        </div>
      )
    }
    return (
      <div className="w-[400px] xl:w-[450px] border-l border-border bg-card h-[calc(100vh-4rem)] sticky top-16 flex flex-col shadow-xl">
        {content}
      </div>
    )
  }

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-[20px] h-[92vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t outline-none shadow-2xl">
          <div className="p-4 bg-background rounded-t-[20px] flex-1 overflow-hidden">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-4" />
            <div className="h-full -mt-2">
              {content}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
