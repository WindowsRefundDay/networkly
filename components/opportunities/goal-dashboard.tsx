"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Target, ChevronRight, Plus, Loader2, CheckCircle2, Clock, Circle } from "lucide-react"
import { getProfileGoals, getProfileGoalsProgress, type ProfileGoalData } from "@/app/actions/goals"
import Link from "next/link"

export function GoalDashboard() {
  const [goals, setGoals] = useState<ProfileGoalData[]>([])
  const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [goalsData, progressData] = await Promise.all([
          getProfileGoals(),
          getProfileGoalsProgress(),
        ])
        setGoals(goalsData.slice(0, 3)) // Show top 3 goals
        setProgress(progressData)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return null

  if (goals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center bg-muted/30">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-sm font-medium mb-1">No Goals Set</h3>
        <p className="text-xs text-muted-foreground mb-3">Set goals to track your progress.</p>
        <Button variant="outline" size="sm" className="w-full h-8 text-xs" asChild>
          <Link href="/profile">
            <Plus className="h-3 w-3 mr-1" />
            Set Goal
          </Link>
        </Button>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-3 w-3 text-green-500" />
      case "in_progress": return <Clock className="h-3 w-3 text-blue-500" />
      default: return <Circle className="h-3 w-3 text-gray-400" />
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Your Goals</h3>
          <p className="text-sm font-medium text-foreground">
            {progress.completed}/{progress.total} completed
          </p>
        </div>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Target className="h-4 w-4 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress.percentage}%</span>
        </div>
        <Progress value={progress.percentage} className="h-1.5" />
      </div>

      <div className="space-y-2">
        {goals.map((goal) => (
          <div key={goal.id} className="flex items-center gap-2 text-xs">
            {getStatusIcon(goal.status)}
            <span className={goal.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}>
              {goal.title}
            </span>
          </div>
        ))}
      </div>

      <Button variant="ghost" className="w-full justify-between h-8 px-2 text-xs text-muted-foreground hover:text-foreground" asChild>
        <Link href="/profile">
          View All Goals
          <ChevronRight className="h-3 w-3" />
        </Link>
      </Button>
    </div>
  )
}
