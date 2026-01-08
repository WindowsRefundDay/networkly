"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Sparkles, TrendingUp } from "lucide-react"

interface SkillsSectionProps {
  skills?: string[]
  interests?: string[]
  skillEndorsements?: { skill: string; count: number }[]
}

export function SkillsSection({
  skills = [],
  interests = [],
  skillEndorsements = []
}: SkillsSectionProps) {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Skills & Endorsements</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="gap-1 text-primary">
            <Sparkles className="h-4 w-4" />
            AI Suggest
          </Button>
          <Button size="sm" variant="outline" className="gap-1 bg-transparent">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => {
            const endorsement = skillEndorsements.find((e) => e.skill === skill)
            return (
              <div key={skill} className="group relative">
                <Badge
                  variant="secondary"
                  className="pr-8 text-sm py-1.5 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {skill}
                  {endorsement && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {endorsement.count}
                    </span>
                  )}
                </Badge>
              </div>
            )
          })}
        </div>
        <div className="pt-2 border-t border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">Interests</h4>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <Badge key={interest} variant="outline" className="text-sm">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

