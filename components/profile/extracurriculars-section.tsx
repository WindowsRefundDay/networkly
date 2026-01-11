"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, MoreHorizontal, FlaskConical, Crown, Wrench, Heart, Calendar, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion"

interface Extracurricular {
  id: string
  title: string
  organization: string
  type: string
  startDate: string
  endDate: string
  description?: string | null
  logo?: string | null
}

interface ExtracurricularsSectionProps {
  extracurriculars?: Extracurricular[]
}

const typeConfig: Record<string, { color: string; icon: React.ElementType; gradient: string }> = {
  Research: { 
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20", 
    icon: FlaskConical,
    gradient: "from-violet-500/5 to-transparent"
  },
  Leadership: { 
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", 
    icon: Crown,
    gradient: "from-amber-500/5 to-transparent"
  },
  Technical: { 
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", 
    icon: Wrench,
    gradient: "from-blue-500/5 to-transparent"
  },
  Volunteer: { 
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", 
    icon: Heart,
    gradient: "from-rose-500/5 to-transparent"
  },
}

const defaultTypeConfig = {
  color: "bg-muted text-muted-foreground border-border",
  icon: Calendar,
  gradient: "from-muted/50 to-transparent"
}

function isCurrentActivity(endDate: string): boolean {
  const normalizedEnd = endDate.toLowerCase().trim()
  return normalizedEnd === "present" || normalizedEnd === "current" || normalizedEnd === "ongoing"
}

function ActivityCard({ activity, index }: { activity: Extracurricular; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = typeConfig[activity.type] || defaultTypeConfig
  const TypeIcon = config.icon
  const isCurrent = isCurrentActivity(activity.endDate)
  const hasDescription = activity.description && activity.description.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <motion.div
        className={`
          relative rounded-xl border border-border bg-card overflow-hidden
          transition-all duration-300 cursor-pointer
          hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20
        `}
        whileHover={{ scale: 1.01, y: -2 }}
        onClick={() => hasDescription && setIsExpanded(!isExpanded)}
      >
        {/* Gradient accent based on type */}
        <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} pointer-events-none`} />
        
        <div className="relative p-4">
          <div className="flex gap-4">
            {/* Logo with type icon overlay */}
            <div className="relative shrink-0">
              <Avatar className="h-14 w-14 rounded-xl border-2 border-background shadow-sm">
                <AvatarImage src={activity.logo || "/placeholder.svg"} alt={activity.organization} />
                <AvatarFallback className="rounded-xl text-lg font-semibold bg-muted">
                  {activity.organization[0]}
                </AvatarFallback>
              </Avatar>
              {/* Type icon badge */}
              <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-lg border ${config.color} bg-card shadow-sm`}>
                <TypeIcon className="h-3 w-3" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-foreground">{activity.title}</h4>
                    {isCurrent && (
                      <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-xs px-2 py-0">
                        Current
                      </Badge>
                    )}
                    {!isCurrent && (
                      <Badge variant="secondary" className="text-xs px-2 py-0 opacity-70">
                        Completed
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{activity.organization}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`${config.color} border text-xs gap-1`}>
                    <TypeIcon className="h-3 w-3" />
                    {activity.type}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Date range */}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{activity.startDate} — {activity.endDate}</span>
              </div>

              {/* Expandable description */}
              <AnimatePresence>
                {isExpanded && hasDescription && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border leading-relaxed">
                      {activity.description}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expand indicator */}
              {hasDescription && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground/60">
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </motion.div>
                  <span>{isExpanded ? "Click to collapse" : "Click to expand"}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function ExtracurricularsSection({ extracurriculars = [] }: ExtracurricularsSectionProps) {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">Experience & Activities</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {extracurriculars.length} {extracurriculars.length === 1 ? "activity" : "activities"}
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 bg-transparent hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-colors">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {extracurriculars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-muted mb-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No activities added yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add your experiences to showcase your involvement</p>
          </div>
        ) : (
          extracurriculars.map((activity, index) => (
            <ActivityCard key={activity.id} activity={activity} index={index} />
          ))
        )}
      </CardContent>
    </Card>
  )
}
