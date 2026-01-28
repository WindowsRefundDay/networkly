"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  ArrowUpRight,
  Users,
  Zap,
  type LucideIcon
} from "lucide-react"
import type { Opportunity } from "@/types/opportunity"
import { getTypeGradient, getMatchScoreColor, formatGradeLevels } from "@/types/opportunity"
import { getCompanyLogoUrl } from "@/lib/company-logo"

interface ExpandedOpportunityCardProps {
  opportunity: Opportunity
  onClose: () => void
  onToggleSave: (id: string) => void
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.25, ease: "easeOut" as const }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" as const }
  }
}

const cardVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.95,
    y: 30
  },
  visible: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { 
      type: "spring" as const,
      stiffness: 350,
      damping: 35,
      delay: 0.05
    }
  }
}

const contentVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 28
    }
  }
}

function StatCard({ icon: Icon, label, value, accent = false }: { 
  icon: LucideIcon
  label: string
  value: string | null | undefined
  accent?: boolean 
}) {
  if (!value) return null
  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-4 
      ${accent 
        ? 'bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20' 
        : 'bg-muted/50 border border-border/40'
      }
      transition-all duration-200 hover:border-primary/30 hover:shadow-sm
    `}>
      <div className={`
        inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3
        ${accent ? 'bg-primary/15 text-primary' : 'bg-background text-muted-foreground'}
      `}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-base font-semibold text-foreground">{value}</p>
    </div>
  )
}

export function ExpandedOpportunityCard({ opportunity, onClose, onToggleSave }: ExpandedOpportunityCardProps) {
  const hasDeadline = opportunity.deadline && opportunity.deadline !== "Rolling"
  const isFree = opportunity.cost?.toLowerCase() === "free" || !opportunity.cost
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const logoUrl = opportunity.logo || getCompanyLogoUrl(opportunity.company) || undefined

  if (!mounted) return null

  return createPortal(
    <>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <motion.div
          layoutId={`opportunity-${opportunity.id}`}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ type: "spring", stiffness: 350, damping: 35 }}
          className="w-full max-w-5xl max-h-[92vh] bg-background rounded-3xl overflow-hidden shadow-2xl flex flex-col pointer-events-auto border border-border/30"
        >
          {/* Hero Header */}
          <div className="relative shrink-0">
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${getTypeGradient(opportunity.type)} opacity-[0.08]`} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
            
            {/* Top Actions */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg border border-border/50 h-10 w-10"
                onClick={() => onToggleSave(opportunity.id)}
              >
                {opportunity.saved ? (
                  <BookmarkCheck className="h-5 w-5 text-primary" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg border border-border/50 h-10 w-10"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg border border-border/50 h-10 w-10"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Header Content */}
            <div className="relative z-10 p-8 sm:p-10 pb-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* Company Logo */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Avatar className="h-24 w-24 rounded-2xl border-4 border-background shadow-2xl relative [image-rendering:crisp-edges]">
                    <AvatarImage src={logoUrl} className="object-cover [image-rendering:crisp-edges]" />
                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary rounded-2xl">
                      {opportunity.company[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Title & Company Info */}
                <div className="flex-1 min-w-0 space-y-4">
                  {/* Badges Row */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`bg-gradient-to-r ${getTypeGradient(opportunity.type)} text-white border-0 px-3 py-1 shadow-sm`}>
                      {opportunity.type}
                    </Badge>
                    {opportunity.remote && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-700/50 px-3 py-1">
                        <Globe className="h-3.5 w-3.5 mr-1.5" />
                        Remote
                      </Badge>
                    )}
                    {opportunity.isExpired && (
                      <Badge variant="destructive" className="px-3 py-1">
                        Expired
                      </Badge>
                    )}
                    {isFree && (
                      <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-700/50 px-3 py-1">
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                        Free
                      </Badge>
                    )}
                  </div>
                  
                  {/* Title */}
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight tracking-tight">
                    {opportunity.title}
                  </h1>
                  
                  {/* Company */}
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Building className="h-5 w-5" />
                    <span className="text-lg font-medium">{opportunity.company}</span>
                    {opportunity.location && (
                      <>
                        <span className="text-border">•</span>
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{opportunity.location}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Match Score & Apply Button */}
                <div className="flex flex-col gap-4 sm:items-end shrink-0 w-full sm:w-auto mt-6 sm:mt-10">
                  {/* Match Score Circle */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <svg className="h-20 w-20 -rotate-90">
                        <circle
                          className="text-muted/20"
                          strokeWidth="6"
                          stroke="currentColor"
                          fill="transparent"
                          r="34"
                          cx="40"
                          cy="40"
                        />
                        <motion.circle
                          className={getMatchScoreColor(opportunity.matchScore)}
                          strokeWidth="6"
                          strokeDasharray={214}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="34"
                          cx="40"
                          cy="40"
                          initial={{ strokeDashoffset: 214 }}
                          animate={{ strokeDashoffset: 214 - (214 * opportunity.matchScore) / 100 }}
                          transition={{ duration: 1, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-2xl font-bold ${getMatchScoreColor(opportunity.matchScore)}`}>
                          {opportunity.matchScore}%
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">match</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Apply Button */}
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto min-w-[180px] h-12 gap-2 text-base font-semibold shadow-lg shadow-primary/25 rounded-xl" 
                    onClick={() => window.open(opportunity.url || opportunity.applicationUrl || '', '_blank')}
                  >
                    Apply Now
                    <ArrowUpRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            <motion.div 
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              className="p-8 sm:p-10 pt-4 space-y-8"
            >
              {/* Stats Grid */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard 
                  icon={Clock} 
                  label="Deadline" 
                  value={hasDeadline ? opportunity.deadline : "Rolling"} 
                  accent={!!hasDeadline}
                />
                <StatCard 
                  icon={MapPin} 
                  label="Location" 
                  value={opportunity.locationType || (opportunity.remote ? "Remote" : opportunity.location)} 
                />
                <StatCard 
                  icon={DollarSign} 
                  label="Cost" 
                  value={opportunity.salary || opportunity.cost || (isFree ? "Free" : null)} 
                />
                <StatCard 
                  icon={Calendar} 
                  label="Duration" 
                  value={opportunity.duration || "Not specified"} 
                />
              </motion.div>

              {/* AI Match Analysis */}
              {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
                <motion.div 
                  variants={itemVariants}
                  className="relative bg-gradient-to-br from-primary/5 via-primary/3 to-transparent rounded-2xl p-6 border border-primary/20"
                >
                  <div className="absolute top-4 right-4 opacity-[0.07]">
                    <Sparkles className="h-32 w-32" />
                  </div>
                  
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 rounded-xl bg-primary/15 text-primary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Why This Matches You</h3>
                      <p className="text-sm text-muted-foreground">AI-powered analysis based on your profile</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {opportunity.matchReasons.map((reason, i) => (
                      <div key={i} className="flex items-start gap-3 bg-background/60 backdrop-blur-sm p-4 rounded-xl border border-border/40">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-sm leading-relaxed">{reason}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column - Description & Requirements */}
                <div className="lg:col-span-2 space-y-8">
                  {/* About Section */}
                  <motion.div variants={itemVariants} className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <div className="w-1 h-6 bg-primary rounded-full" />
                      About this opportunity
                    </h2>
                    <div className="prose prose-sm prose-gray dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap pl-4">
                      {opportunity.description || "No description available."}
                    </div>
                  </motion.div>

                  {/* Requirements Section */}
                  {opportunity.requirements && (
                    <motion.div variants={itemVariants} className="space-y-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <div className="w-1 h-6 bg-amber-500 rounded-full" />
                        Requirements
                      </h2>
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {opportunity.requirements}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Skills Section */}
                  {opportunity.skills && opportunity.skills.length > 0 && (
                    <motion.div variants={itemVariants} className="space-y-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                        Skills & Technologies
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {opportunity.skills.map((skill) => (
                          <Badge 
                            key={skill} 
                            className="px-4 py-2 text-sm font-medium bg-muted/60 hover:bg-muted border-border/50 text-foreground rounded-xl transition-colors"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Right Column - Additional Info */}
                <div className="space-y-6">
                  {/* Grade Levels */}
                  {opportunity.gradeLevels && opportunity.gradeLevels.length > 0 && (
                    <motion.div 
                      variants={itemVariants}
                      className="bg-muted/40 rounded-2xl p-5 border border-border/40"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-background">
                          <GraduationCap className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold">Eligibility</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatGradeLevels(opportunity.gradeLevels)}</p>
                    </motion.div>
                  )}

                  {/* Prizes */}
                  {opportunity.prizes && (
                    <motion.div 
                      variants={itemVariants}
                      className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl p-5 border border-amber-500/20"
                    >
                      <div className="flex items-center gap-3 mb-3 text-amber-600 dark:text-amber-400">
                        <div className="p-2 rounded-lg bg-amber-500/15">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold">Prizes & Awards</h3>
                      </div>
                      <p className="text-sm text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                        {opportunity.prizes}
                      </p>
                    </motion.div>
                  )}

                  {/* Stats Footer */}
                  <motion.div 
                    variants={itemVariants}
                    className="bg-muted/30 rounded-2xl p-5 border border-border/30 space-y-4"
                  >
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Posted
                      </span>
                      <span className="font-medium">{opportunity.postedDate || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Applicants
                      </span>
                      <span className="font-medium">{opportunity.applicants || "—"}</span>
                    </div>
                    
                    {opportunity.extractionConfidence !== undefined && opportunity.extractionConfidence !== null && (
                      <div className="pt-3 border-t border-border/50 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Data Confidence</span>
                          <span className="font-medium text-primary">
                            {Math.round(opportunity.extractionConfidence * 100)}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${opportunity.extractionConfidence * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {opportunity.sourceUrl && (
                      <a 
                        href={opportunity.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline pt-2 font-medium"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Original Source
                      </a>
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </ScrollArea>
        </motion.div>
      </div>
    </>,
    document.body
  )
}
