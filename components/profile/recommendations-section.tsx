"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Sparkles, Quote } from "lucide-react"

const recommendations = [
  {
    id: "1",
    author: "Prof. Michael Chen",
    role: "Professor of Computer Science, Stanford",
    avatar: "/professor-avatar.png",
    content:
      "Alex is one of the most dedicated students I've had the pleasure of mentoring. Their work on NLP projects demonstrates both technical excellence and creative problem-solving.",
    date: "Nov 2025",
  },
  {
    id: "2",
    author: "Jessica Wu",
    role: "Engineering Manager, Google",
    avatar: "/manager-avatar.png",
    content:
      "During their internship, Alex showed exceptional ability to learn quickly and contribute meaningfully to our ML infrastructure team. Highly recommend!",
    date: "Aug 2025",
  },
]

export function RecommendationsSection() {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Recommendations</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="gap-1 text-primary">
            <Sparkles className="h-4 w-4" />
            AI Request
          </Button>
          <Button size="sm" variant="outline" className="gap-1 bg-transparent">
            <Plus className="h-4 w-4" />
            Request
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec, index) => (
          <div
            key={rec.id}
            className={`relative ${index !== recommendations.length - 1 ? "pb-4 border-b border-border" : ""}`}
          >
            <Quote className="absolute -left-1 -top-1 h-6 w-6 text-muted-foreground/20" />
            <p className="text-muted-foreground leading-relaxed pl-4 mb-3">{rec.content}</p>
            <div className="flex items-center gap-3 pl-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={rec.avatar || "/placeholder.svg"} alt={rec.author} />
                <AvatarFallback>{rec.author[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium text-foreground text-sm">{rec.author}</h4>
                <p className="text-xs text-muted-foreground">{rec.role}</p>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{rec.date}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
