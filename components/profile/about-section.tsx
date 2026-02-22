"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Sparkles } from "lucide-react"
import { EditAboutDialog } from "./dialogs"
import { toast } from "sonner"

interface AboutSectionProps {
  bio?: string | null
}

export function AboutSection({ bio = "" }: AboutSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleAIImprove = () => {
    toast.info("AI Improve coming soon!", {
      description: "This feature is currently in development."
    })
  }

  return (
    <>
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">About</CardTitle>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="gap-1 text-primary"
              onClick={handleAIImprove}
            >
              <Sparkles className="h-4 w-4" />
              AI Improve
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDialogOpen(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{bio || "No bio provided yet."}</p>
        </CardContent>
      </Card>

      <EditAboutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentBio={bio}
      />
    </>
  )
}
