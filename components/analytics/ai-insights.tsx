"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, TrendingUp, Target, Users, Lightbulb, ArrowRight, Loader2 } from "lucide-react"
import { generateInsights } from "@/app/actions/insights"

const iconMap: Record<string, any> = {
  TrendingUp,
  Target,
  Users,
  Lightbulb,
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
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
          <p className="text-sm text-muted-foreground">Personalized recommendations based on your activity</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (insights.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
          <p className="text-sm text-muted-foreground">Personalized recommendations based on your activity</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Keep using Networkly to get personalized insights!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Insights
        </CardTitle>
        <p className="text-sm text-muted-foreground">Personalized recommendations based on your activity</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight) => {
          const IconComponent = iconMap[insight.icon] || Lightbulb
          return (
          <div
            key={insight.title}
            className="flex gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <div className={`rounded-full p-2 h-fit ${insight.color}`}>
                <IconComponent className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground text-sm">{insight.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
              <Button variant="ghost" size="sm" className="mt-2 gap-1 text-primary h-auto p-0">
                {insight.action}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
