"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Target, CheckCircle2, Circle, Clock, Loader2 } from "lucide-react"
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
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Target className="h-5 w-5 text-primary" />
            Goals Progress
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

  if (goals.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Target className="h-5 w-5 text-primary" />
            Goals Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Set goals on your profile to track your progress!
          </p>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
      case "in_progress": return <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
      default: return <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
    }
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Target className="h-5 w-5 text-primary" />
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
            <div className="rounded-lg bg-blue-500/10 p-2">
              <div className="font-semibold text-blue-600">{progress.inProgress}</div>
              <div className="text-muted-foreground">In Progress</div>
            </div>
            <div className="rounded-lg bg-green-500/10 p-2">
              <div className="font-semibold text-green-600">{progress.completed}</div>
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
    </Card>
  )
}
