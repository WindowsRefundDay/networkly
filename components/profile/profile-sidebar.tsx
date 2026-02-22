"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TrendingUp, Linkedin, Github, Globe, ExternalLink, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface SuggestedPerson {
  id: string
  name: string
  headline?: string | null
  avatar?: string | null
}

interface ProfileSidebarProps {
  suggestedConnections?: SuggestedPerson[]
  profileStrength?: number
  linkedinUrl?: string | null
  githubUrl?: string | null
  portfolioUrl?: string | null
  showStrength?: boolean
}

function getProfileTip(strength: number): string {
  if (strength >= 90) return "Your profile is outstanding!"
  if (strength >= 80) return "Great profile! Consider adding more projects."
  if (strength >= 60) return "Add skills and a bio to improve your profile."
  if (strength >= 40) return "Complete your profile to get more visibility."
  return "Start by adding your basic information."
}

export function ProfileSidebar({ 
  suggestedConnections = [], 
  profileStrength = 0, 
  linkedinUrl, 
  githubUrl, 
  portfolioUrl,
  showStrength = true
}: ProfileSidebarProps) {
  const router = useRouter()

  const handleImproveProfile = () => {
    router.push("/settings")
  }

  return (
    <div className="space-y-6">
      {showStrength && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <TrendingUp className="h-5 w-5 text-primary" />
              Profile Strength
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">{profileStrength}%</span>
              <span className={`text-sm font-medium ${
                profileStrength >= 80 ? "text-green-500" : 
                profileStrength >= 50 ? "text-amber-500" : 
                "text-red-500"
              }`}>
                {profileStrength >= 80 ? "Strong" : profileStrength >= 50 ? "Good" : "Needs Work"}
              </span>
            </div>
            <Progress value={profileStrength} className="h-2" />
            <p className="text-xs text-muted-foreground">{getProfileTip(profileStrength)}</p>
            <Button 
              size="sm" 
              variant="outline"
              className="w-full gap-1"
              onClick={handleImproveProfile}
            >
              <Settings className="h-4 w-4" />
              Improve Profile
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {linkedinUrl && (
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 bg-transparent"
              onClick={() => window.open(linkedinUrl, '_blank')}
            >
              <Linkedin className="h-4 w-4 text-[#0A66C2]" />
              LinkedIn
              <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
            </Button>
          )}
          {githubUrl && (
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 bg-transparent"
              onClick={() => window.open(githubUrl, '_blank')}
            >
              <Github className="h-4 w-4" />
              GitHub
              <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
            </Button>
          )}
          {portfolioUrl && (
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 bg-transparent"
              onClick={() => window.open(portfolioUrl, '_blank')}
            >
              <Globe className="h-4 w-4 text-primary" />
              Portfolio
              <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
            </Button>
          )}
          {!linkedinUrl && !githubUrl && !portfolioUrl && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No links added yet</p>
              <Button 
                variant="link" 
                size="sm" 
                className="text-primary"
                onClick={handleImproveProfile}
              >
                Add links in settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {suggestedConnections.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">People Also Viewed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestedConnections.slice(0, 2).map((person) => (
              <div key={person.id} className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {person.avatar ? (
                    <Image
                      src={person.avatar}
                      alt={person.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <AvatarFallback>{person.name[0]}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground truncate">{person.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{person.headline}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
