"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import { getProfileGoals, getProfileGoalsProgress, type ProfileGoalData } from "@/app/actions/goals"

export function GoalsProgress() {
  const [goals, setGoals] = useState<ProfileGoalData[]>([])
  const [progress, setProgress] = useState({ total: 0, completed: 0, inProgress: 0, pending: 0, percentage: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGoalProgress() {
      try {
        const [goalsData, progressData] = await Promise.all([
          getProfileGoals(),
          getProfileGoalsProgress(),
        ])
        setGoals(goalsData)
        setProgress(progressData)
      } catch (error) {
        console.error("Failed to fetch goal progress:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchGoalProgress()
  }, [])

  if (loading) {
    return (
      <GlassCard className="border-border">
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <i className="bx bx-target-lock text-xl text-primary" />
            Goals Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <i className="bx bx-loader-alt animate-spin text-2xl text-muted-foreground" />
          </div>
        </CardContent>
      </GlassCard>
    )
  }

  if (goals.length === 0) {
    return (
      <GlassCard className="border-border">
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <i className="bx bx-target-lock text-xl text-primary" />
            Goals Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <i className="bx bx-target-lock text-4xl mb-2 text-muted-foreground opacity-20" />
            <p className="text-sm text-muted-foreground">
              Set goals on your profile to track your progress!
            </p>
          </div>
        </CardContent>
      </GlassCard>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <i className="bx bx-check-circle text-primary mt-0.5 flex-shrink-0" />
      case "in_progress": return <i className="bx bx-time-five text-primary mt-0.5 flex-shrink-0" />
      default: return <i className="bx bx-circle text-muted-foreground mt-0.5 flex-shrink-0" />
    }
  }

  return (
    <GlassCard className="border-border">
      <CardHeader className="pb-2 pt-6">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <i className="bx bx-target-lock text-xl text-primary" />
          Goals Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground text-sm">
              {progress.completed} of {progress.total} goals completed
            </h4>
            <span className="text-sm font-semibold text-primary">{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/50 p-2">
              <div className="font-semibold text-foreground">{progress.pending}</div>
              <div className="text-muted-foreground">Pending</div>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <div className="font-semibold text-primary">{progress.inProgress}</div>
              <div className="text-muted-foreground">In Progress</div>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <div className="font-semibold text-primary">{progress.completed}</div>
              <div className="text-muted-foreground">Completed</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 mt-4">
            {goals.slice(0, 4).map((goal) => (
              <div key={goal.id} className="flex items-start gap-2 text-xs">
                {getStatusIcon(goal.status)}
                <span className={goal.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}>
                  {goal.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </GlassCard>
  )
}
