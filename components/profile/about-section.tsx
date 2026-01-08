"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Sparkles } from "lucide-react"
import { currentUser } from "@/lib/mock-data"

export function AboutSection() {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">About</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="gap-1 text-primary">
            <Sparkles className="h-4 w-4" />
            AI Improve
          </Button>
          <Button size="sm" variant="ghost">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">{currentUser.bio}</p>
      </CardContent>
    </Card>
  )
}
