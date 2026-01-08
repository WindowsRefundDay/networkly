"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Award, Star, Plus } from "lucide-react"
import type React from "react"

interface Achievement {
  id: string
  title: string
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

export function AchievementsSection({ achievements = [] }: AchievementsSectionProps) {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Achievements</CardTitle>
        <Button size="sm" variant="outline" className="gap-1 bg-transparent">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => {
            const Icon = iconMap[achievement.icon] || Trophy
            const colors = iconColors[achievement.icon] || iconColors.trophy
            return (
              <div
                key={achievement.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className={`rounded-full p-2 ${colors}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-foreground truncate">{achievement.title}</h4>
                  <p className="text-xs text-muted-foreground">{achievement.date}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

