"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Target, Sparkles, Plus, X, TrendingUp } from "lucide-react"

const defaultGoals = [
  { id: "1", title: "Get a summer internship in AI/ML", progress: 65, matches: 12 },
  { id: "2", title: "Win a hackathon", progress: 40, matches: 5 },
]

export function GoalDashboard() {
  const [goals, setGoals] = useState(defaultGoals)
  const [newGoal, setNewGoal] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, { id: Date.now().toString(), title: newGoal, progress: 0, matches: 0 }])
      setNewGoal("")
      setIsAdding(false)
    }
  }

  const handleRemoveGoal = (id: string) => {
    setGoals(goals.filter((g) => g.id !== id))
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Target className="h-5 w-5 text-primary" />
          Career Goals
        </CardTitle>
        {!isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)} className="gap-1 bg-transparent">
            <Plus className="h-4 w-4" />
            Add Goal
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Get a biotech internship"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
              autoFocus
            />
            <Button size="sm" onClick={handleAddGoal}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {goals.map((goal) => (
          <div key={goal.id} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-foreground">{goal.title}</h4>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemoveGoal(goal.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={goal.progress} className="flex-1 h-2" />
              <span className="text-sm font-medium text-primary">{goal.progress}%</span>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {goal.matches} matching opportunities
              </Badge>
              <Button size="sm" variant="ghost" className="gap-1 text-primary">
                <Sparkles className="h-4 w-4" />
                AI Curate
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
