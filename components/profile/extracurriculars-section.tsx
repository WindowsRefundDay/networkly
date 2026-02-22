"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, MoreHorizontal, FlaskConical, Crown, Wrench, Heart, Calendar, ChevronDown, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AddExtracurricularDialog } from "./dialogs"
import { deleteExtracurricular } from "@/app/actions/profile-items"
import { toast } from "sonner"
import Image from "next/image"

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

interface ActivityCardProps {
  activity: Extracurricular
  onEdit: (activity: Extracurricular) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

function ActivityCard({ activity, onEdit, onDelete, isDeleting }: ActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = typeConfig[activity.type] || defaultTypeConfig
  const TypeIcon = config.icon
  const isCurrent = isCurrentActivity(activity.endDate)
  const hasDescription = activity.description && activity.description.length > 0

  return (
    <div
      className={`
        relative rounded-xl border border-border bg-card overflow-hidden
        transition-all duration-300 cursor-pointer group
        hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20
      `}
      onClick={() => hasDescription && setIsExpanded(!isExpanded)}
    >
      {/* Gradient accent based on type */}
      <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} pointer-events-none`} />
      
      <div className="relative p-4">
        <div className="flex gap-4">
          {/* Logo with type icon overlay */}
          <div className="relative shrink-0">
            <Avatar className="h-14 w-14 rounded-xl border-2 border-background shadow-sm">
              {activity.logo ? (
                <Image
                  src={activity.logo}
                  alt={activity.organization}
                  width={56}
                  height={56}
                  className="rounded-xl object-cover"
                />
              ) : (
                <AvatarFallback className="rounded-xl text-lg font-semibold bg-muted">
                  {activity.organization[0]}
                </AvatarFallback>
              )}
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
                    <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(activity) }}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDelete(activity.id) }}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
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
            {isExpanded && hasDescription && (
              <div className="overflow-hidden">
                <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border leading-relaxed">
                  {activity.description}
                </p>
              </div>
            )}

            {/* Expand indicator */}
            {hasDescription && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground/60">
                <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                <span>{isExpanded ? "Click to collapse" : "Click to expand"}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const INITIAL_DISPLAY_COUNT = 3

export function ExtracurricularsSection({ extracurriculars = [] }: ExtracurricularsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingExtracurricular, setEditingExtracurricular] = useState<Extracurricular | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [isPending, startTransition] = useTransition()

  const displayedItems = showAll ? extracurriculars : extracurriculars.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMore = extracurriculars.length > INITIAL_DISPLAY_COUNT
  const remainingCount = extracurriculars.length - INITIAL_DISPLAY_COUNT

  const handleEdit = (activity: Extracurricular) => {
    setEditingExtracurricular(activity)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteExtracurricular(id)
        toast.success("Activity deleted")
      } catch (error) {
        toast.error("Failed to delete activity")
      }
    })
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) setEditingExtracurricular(null)
  }

  return (
    <>
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-semibold">Experience & Activities</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {extracurriculars.length} {extracurriculars.length === 1 ? "activity" : "activities"}
            </p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1.5 bg-transparent hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-colors"
            onClick={() => setDialogOpen(true)}
          >
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
            <>
              {displayedItems.map((activity) => (
                <ActivityCard 
                  key={activity.id} 
                  activity={activity} 
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDeleting={isPending}
                />
              ))}
              
              {hasMore && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAll(!showAll)}
                  >
                    <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showAll ? "rotate-180" : ""}`} />
                    {showAll ? "Show less" : `Show ${remainingCount} more activit${remainingCount > 1 ? "ies" : "y"}`}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AddExtracurricularDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        extracurricular={editingExtracurricular}
      />
    </>
  )
}
