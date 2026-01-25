"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { generateInsights } from "@/app/actions/insights"

const iconMap: Record<string, string> = {
  TrendingUp: "bx bx-trending-up",
  Target: "bx bx-target-lock",
  Users: "bx bx-group",
  Lightbulb: "bx bx-bulb",
}

export function AIInsights() {
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchInsights() {
      try {
        const data = await generateInsights()
        setInsights(data)
      } catch (error) {
        console.error("Failed to fetch AI insights:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchInsights()
  }, [])

  if (loading) {
    return (
      <GlassCard className="border-border pb-6">
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <i className="bx bx-sparkles text-xl text-primary" />
            AI Insights
          </CardTitle>
          <p className="text-sm text-muted-foreground">Personalized recommendations based on your activity</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <i className="bx bx-loader-alt animate-spin text-2xl text-muted-foreground" />
          </div>
        </CardContent>
      </GlassCard>
    )
  }

  if (insights.length === 0) {
    return (
      <GlassCard className="border-border pb-6">
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <i className="bx bx-sparkles text-xl text-primary" />
            AI Insights
          </CardTitle>
          <p className="text-sm text-muted-foreground">Personalized recommendations based on your activity</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Keep using Networkly to get personalized insights!
          </p>
        </CardContent>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="border-border pb-6">
      <CardHeader className="pb-2 pt-6">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <i className="bx bx-sparkles text-xl text-primary" />
          AI Insights
        </CardTitle>
        <p className="text-sm text-muted-foreground">Personalized recommendations based on your activity</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight) => {
          const iconClass = iconMap[insight.icon] || "bx bx-bulb"
          return (
            <div
              key={insight.title}
              className="flex gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="rounded-full p-2 h-fit flex items-center justify-center text-primary bg-primary/10">
                <i className={`${iconClass} text-xl`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground text-sm">{insight.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                <Button variant="ghost" size="sm" className="mt-2 gap-1 text-primary h-auto p-0">
                  {insight.action}
                  <i className="bx bx-right-arrow-alt text-lg" />
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </GlassCard>
  )
}
