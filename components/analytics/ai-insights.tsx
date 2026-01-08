"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, TrendingUp, Target, Users, Lightbulb, ArrowRight } from "lucide-react"

const insights = [
  {
    icon: TrendingUp,
    title: "Profile Engagement Up",
    description: "Your profile views increased 15% this week. Your updated bio is resonating with viewers.",
    action: "View Details",
    color: "text-secondary bg-secondary/10",
  },
  {
    icon: Target,
    title: "Skill Gap Identified",
    description: "Adding 'AWS' or 'Cloud Computing' could increase your match rate by 12% for target roles.",
    action: "Add Skill",
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    icon: Users,
    title: "Network Opportunity",
    description: "3 people from your target companies viewed your profile. Consider reaching out!",
    action: "View Profiles",
    color: "text-primary bg-primary/10",
  },
  {
    icon: Lightbulb,
    title: "Application Timing",
    description: "Best time to apply for ML roles is Tuesdays. Schedule your next application accordingly.",
    action: "Schedule",
    color: "text-rose-500 bg-rose-500/10",
  },
]

export function AIInsights() {
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
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="flex gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <div className={`rounded-full p-2 h-fit ${insight.color}`}>
              <insight.icon className="h-5 w-5" />
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
        ))}
      </CardContent>
    </Card>
  )
}
