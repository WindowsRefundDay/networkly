"use client"

import { useState, useTransition, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Target, 
  Plus, 
  ChevronDown, 
  Trash2, 
  MoreHorizontal, 
  Pencil,
  CheckCircle2,
  Clock,
  Circle,
  Loader2
} from "lucide-react"
import { AddGoalDialog } from "./dialogs"
import { 
  getProfileGoals, 
  deleteProfileGoal, 
  updateProfileGoalStatus,
  getProfileGoalsProgress,
  type ProfileGoalStatus,
  type ProfileGoalData
} from "@/app/actions/goals"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const INITIAL_DISPLAY_COUNT = 4

const statusConfig: Record<ProfileGoalStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "Pending", icon: Circle, color: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
  in_progress: { label: "In Progress", icon: Clock, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-green-500/10 text-green-600 border-green-500/20" },
}

export function GoalsTracker() {
  const [goals, setGoals] = useState<ProfileGoalData[]>([])
  const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 })
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<ProfileGoalData | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    try {
      const [goalsData, progressData] = await Promise.all([
        getProfileGoals(),
        getProfileGoalsProgress(),
      ])
      setGoals(goalsData)
      setProgress(progressData)
    } catch (error) {
      console.error("[GoalsTracker] Failed to fetch goals:", error)
    } finally {
      setLoading(false)
    }
  }

  const displayedGoals = showAll ? goals : goals.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMore = goals.length > INITIAL_DISPLAY_COUNT
  const remainingCount = goals.length - INITIAL_DISPLAY_COUNT

  const handleEdit = (goal: ProfileGoalData) => {
    setEditingGoal(goal)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteProfileGoal(id)
        setGoals((prev) => prev.filter((g) => g.id !== id))
        toast.success("Goal deleted")
        fetchGoals()
      } catch (error) {
        toast.error("Failed to delete goal")
      }
    })
  }

  const handleStatusChange = (id: string, newStatus: ProfileGoalStatus) => {
    startTransition(async () => {
      try {
        await updateProfileGoalStatus(id, newStatus)
        setGoals((prev) => 
          prev.map((g) => g.id === id ? { ...g, status: newStatus } : g)
        )
        toast.success("Status updated")
        fetchGoals()
      } catch (error) {
        toast.error("Failed to update status")
      }
    })
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingGoal(null)
      fetchGoals()
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return dateStr
    }
  }

  const isOverdue = (dateStr: string, status: ProfileGoalStatus) => {
    if (status === "completed") return false
    const date = new Date(dateStr)
    return date < new Date()
  }

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Target className="h-5 w-5 text-primary" />
            Goals Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Target className="h-5 w-5 text-primary" />
            Goals Tracker
          </CardTitle>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1 bg-transparent"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Goal
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {progress.completed}/{progress.total} completed ({progress.percentage}%)
                </span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </div>
          )}

          {goals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-muted-foreground">No goals set yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Set goals to track your progress and stay motivated
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {displayedGoals.map((goal) => {
                  const config = statusConfig[goal.status]
                  const StatusIcon = config.icon
                  const overdue = isOverdue(goal.targetDate, goal.status)

                  return (
                    <div
                      key={goal.id}
                      className="group flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={`h-8 w-8 shrink-0 ${config.color} hover:opacity-80`}
                            disabled={isPending}
                          >
                            <StatusIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(goal.id, "pending")}
                            disabled={goal.status === "pending"}
                          >
                            <Circle className="h-4 w-4 mr-2 text-gray-500" />
                            Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(goal.id, "in_progress")}
                            disabled={goal.status === "in_progress"}
                          >
                            <Clock className="h-4 w-4 mr-2 text-blue-500" />
                            In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(goal.id, "completed")}
                            disabled={goal.status === "completed"}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                            Completed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="min-w-0 flex-1">
                        <h4 className={`font-medium text-sm ${goal.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {goal.title}
                        </h4>
                        <p className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                          Target: {formatDate(goal.targetDate)}
                          {overdue && " (overdue)"}
                        </p>
                      </div>

                      <Badge variant="outline" className={`text-xs shrink-0 ${config.color}`}>
                        {config.label}
                      </Badge>

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
                          <DropdownMenuItem onClick={() => handleEdit(goal)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(goal.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                })}
              </div>
              
              {hasMore && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAll(!showAll)}
                >
                  <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showAll ? "rotate-180" : ""}`} />
                  {showAll ? "Show less" : `Show ${remainingCount} more goal${remainingCount > 1 ? "s" : ""}`}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AddGoalDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        goal={editingGoal}
      />
    </>
  )
}
