"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Mail, MessageSquare, Target, Calendar, Users, Lightbulb, GraduationCap } from "lucide-react"

const aiTools = [
  { icon: FileText, label: "Cover Letter", description: "AI-generated cover letters" },
  { icon: Mail, label: "Email Drafts", description: "Professional networking emails" },
  { icon: MessageSquare, label: "Icebreakers", description: "Conversation starters" },
  { icon: Target, label: "Career Path", description: "Personalized roadmap" },
  { icon: Calendar, label: "Interview Prep", description: "Practice questions" },
  { icon: Users, label: "Who to Contact", description: "Strategic connections" },
  { icon: Lightbulb, label: "Skill Gaps", description: "Learning recommendations" },
  { icon: GraduationCap, label: "Application Help", description: "Optimize applications" },
]

export function AIToolsSidebar() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">AI Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {aiTools.map((tool) => (
          <Button key={tool.label} variant="ghost" className="w-full justify-start gap-3 h-auto py-3 px-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <tool.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <span className="text-sm font-medium text-foreground">{tool.label}</span>
              <p className="text-xs text-muted-foreground">{tool.description}</p>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
