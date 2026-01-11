"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  MapPin, 
  Clock, 
  Users, 
  Bookmark, 
  BookmarkCheck, 
  ArrowRight,
  Sparkles
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

interface OpportunityCardProps {
  opportunity: Opportunity
  isSelected: boolean
  onSelect: (opportunity: Opportunity) => void
  onToggleSave: (e: React.MouseEvent, id: string) => void
  saving?: boolean
}

// Gradient mapping based on opportunity type
const getTypeGradient = (type: string) => {
  const normalizedType = type.toLowerCase()
  if (normalizedType.includes("internship")) return "from-blue-600 to-indigo-600"
  if (normalizedType.includes("fellowship")) return "from-violet-600 to-purple-600"
  if (normalizedType.includes("scholarship")) return "from-amber-500 to-orange-600"
  if (normalizedType.includes("competition")) return "from-rose-500 to-pink-600"
  if (normalizedType.includes("research")) return "from-teal-500 to-cyan-600"
  if (normalizedType.includes("volunteer")) return "from-emerald-500 to-green-600"
  return "from-slate-600 to-gray-600"
}

// Match score color
const getMatchColor = (score: number) => {
  if (score >= 90) return "text-emerald-500"
  if (score >= 75) return "text-blue-500"
  if (score >= 60) return "text-amber-500"
  return "text-slate-400"
}

export function OpportunityCard({ 
  opportunity, 
  isSelected, 
  onSelect, 
  onToggleSave,
  saving = false 
}: OpportunityCardProps) {
  return (
    <motion.div
      layoutId={`card-${opportunity.id}`}
      whileHover={{ y: -4, scale: 1.01 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-full"
    >
      <Card 
        className={`
          relative h-full overflow-hidden border-border transition-all duration-300 cursor-pointer
          hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 group
          ${isSelected ? "ring-2 ring-primary border-primary shadow-lg shadow-primary/10" : ""}
        `}
        onClick={() => onSelect(opportunity)}
      >
        {/* Banner Gradient */}
        <div className={`h-24 w-full bg-gradient-to-r ${getTypeGradient(opportunity.type)} opacity-90 group-hover:opacity-100 transition-opacity`} />
        
        {/* Content Container */}
        <div className="relative px-5 pb-5 -mt-10">
          {/* Header Row: Logo & Match Score */}
          <div className="flex justify-between items-end mb-3">
            <Avatar className="h-16 w-16 rounded-xl border-4 border-card shadow-sm bg-card">
              <AvatarImage src={opportunity.logo || "/placeholder.svg"} alt={opportunity.company} className="object-cover" />
              <AvatarFallback className="rounded-xl text-xl font-bold bg-muted text-muted-foreground">
                {opportunity.company[0]}
              </AvatarFallback>
            </Avatar>
            
            {/* Circular Match Score */}
            <div className="flex flex-col items-center bg-card rounded-full px-2 py-1 shadow-sm border border-border/50">
              <div className="relative flex items-center justify-center">
                <svg className="h-10 w-10 -rotate-90">
                  <circle
                    className="text-muted/20"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="transparent"
                    r="16"
                    cx="20"
                    cy="20"
                  />
                  <circle
                    className={getMatchColor(opportunity.matchScore)}
                    strokeWidth="3"
                    strokeDasharray={100}
                    strokeDashoffset={100 - opportunity.matchScore}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="16"
                    cx="20"
                    cy="20"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-[10px] font-bold ${getMatchColor(opportunity.matchScore)}`}>
                    {opportunity.matchScore}%
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground -mt-1">match</span>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-lg leading-tight text-foreground group-hover:text-primary transition-colors">
                {opportunity.title}
              </h3>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">
                {opportunity.company}
              </p>
            </div>

            {/* Metadata Row */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {opportunity.remote ? "Remote" : opportunity.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {opportunity.deadline || "Rolling"}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {opportunity.applicants} applicants
              </span>
            </div>

            {/* Description Preview */}
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {opportunity.description || "No description available for this opportunity."}
            </p>
          </div>

          {/* Action Footer */}
          <div className="mt-5 flex gap-2">
            <Button className="flex-1 h-9 text-xs font-medium bg-primary hover:bg-primary/90 shadow-sm">
              Apply
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className={`h-9 w-9 shrink-0 ${opportunity.saved ? "border-primary/50 text-primary bg-primary/5" : "hover:bg-muted"}`}
              onClick={(e) => onToggleSave(e, opportunity.id)}
              disabled={saving}
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
  )
}
