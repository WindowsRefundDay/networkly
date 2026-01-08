"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, Linkedin, Github, Globe, ExternalLink } from "lucide-react"

interface SuggestedPerson {
  id: string
  name: string
  headline?: string | null
  avatar?: string | null
}

interface ProfileSidebarProps {
  suggestedConnections?: SuggestedPerson[]
  profileStrength?: number
}

export function ProfileSidebar({ suggestedConnections = [], profileStrength = 85 }: ProfileSidebarProps) {
  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            Profile Strength
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground">{profileStrength}%</span>
            <span className="text-sm text-secondary font-medium">
              {profileStrength >= 80 ? "Strong" : profileStrength >= 50 ? "Good" : "Needs Work"}
            </span>
          </div>
          <Progress value={profileStrength} className="h-2" />
          <p className="text-xs text-muted-foreground">Add 2 more skills and a project to reach All-Star status</p>
          <Button size="sm" className="w-full gap-1">
            <Sparkles className="h-4 w-4" />
            AI Optimize Profile
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
            <Linkedin className="h-4 w-4 text-[#0A66C2]" />
            LinkedIn
            <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
            <Github className="h-4 w-4" />
            GitHub
            <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
            <Globe className="h-4 w-4 text-primary" />
            Portfolio
            <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">People Also Viewed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestedConnections.slice(0, 2).map((person) => (
            <div key={person.id} className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={person.avatar || "/placeholder.svg"} alt={person.name} />
                <AvatarFallback>{person.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground truncate">{person.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{person.headline}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

