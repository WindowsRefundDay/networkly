"use client"

import { useState, useTransition, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, Award, Star, Plus, ChevronDown, Trash2, MoreHorizontal, Pencil } from "lucide-react"
import { AddAchievementDialog } from "./dialogs"
import { deleteAchievement } from "@/app/actions/profile-items"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type React from "react"

interface Achievement {
  id: string
  title: string
  category?: string
  description?: string | null
  date: string
  icon: string
}

interface AchievementsSectionProps {
  achievements?: Achievement[]
}

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  award: Award,
  star: Star,
}

const iconColors: Record<string, string> = {
  trophy: "text-amber-500 bg-amber-500/10",
  award: "text-primary bg-primary/10",
  star: "text-secondary bg-secondary/10",
}

const categoryColors: Record<string, string> = {
  Academic: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Athletic: "bg-green-500/10 text-green-600 border-green-500/20",
  Service: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Arts: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  Other: "bg-gray-500/10 text-gray-600 border-gray-500/20",
}

const CATEGORIES = ["All", "Academic", "Athletic", "Service", "Arts", "Other"] as const
const INITIAL_DISPLAY_COUNT = 6

export function AchievementsSection({ achievements = [] }: AchievementsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [isPending, startTransition] = useTransition()

  const filteredAchievements = useMemo(() => {
    if (selectedCategory === "All") return achievements
    return achievements.filter((a) => a.category === selectedCategory)
  }, [achievements, selectedCategory])

  const displayedAchievements = showAll 
    ? filteredAchievements 
    : filteredAchievements.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMore = filteredAchievements.length > INITIAL_DISPLAY_COUNT
  const remainingCount = filteredAchievements.length - INITIAL_DISPLAY_COUNT

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: achievements.length }
    achievements.forEach((a) => {
      const cat = a.category || "Other"
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [achievements])

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteAchievement(id)
        toast.success("Achievement deleted")
      } catch (error) {
        toast.error("Failed to delete achievement")
      }
    })
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) setEditingAchievement(null)
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    } catch {
      return dateStr
    }
  }

  return (
    <>
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Achievements</CardTitle>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1 bg-transparent"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {achievements.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map((category) => {
                const count = categoryCounts[category] || 0
                if (category !== "All" && count === 0) return null
                return (
                  <Button
                    key={category}
                    size="sm"
                    variant={selectedCategory === category ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => {
                      setSelectedCategory(category)
                      setShowAll(false)
                    }}
                  >
                    {category}
                    {count > 0 && (
                      <span className="ml-1 text-xs opacity-70">({count})</span>
                    )}
                  </Button>
                )
              })}
            </div>
          )}

          {achievements.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-muted-foreground">No achievements yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Add your accomplishments to showcase your success
              </p>
            </div>
          ) : filteredAchievements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No {selectedCategory.toLowerCase()} achievements</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {displayedAchievements.map((achievement) => {
                  const Icon = iconMap[achievement.icon] || Trophy
                  const colors = iconColors[achievement.icon] || iconColors.trophy
                  const catColor = categoryColors[achievement.category || "Other"] || categoryColors.Other
                  return (
                    <div
                      key={achievement.id}
                      className="group flex flex-col gap-2 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors relative"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-full p-2 ${colors} shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-foreground text-sm line-clamp-2">{achievement.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(achievement.date)}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(achievement)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(achievement.id)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {achievement.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 pl-11">
                          {achievement.description}
                        </p>
                      )}
                      <div className="pl-11">
                        <Badge variant="outline" className={`text-xs ${catColor}`}>
                          {achievement.category || "Other"}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {hasMore && (
                <div className="pt-4">
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAll(!showAll)}
                  >
                    <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showAll ? "rotate-180" : ""}`} />
                    {showAll ? "Show less" : `Show ${remainingCount} more achievement${remainingCount > 1 ? "s" : ""}`}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AddAchievementDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        achievement={editingAchievement}
      />
    </>
  )
}
