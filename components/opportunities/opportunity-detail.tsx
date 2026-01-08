"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  MapPin,
  Clock,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Users,
  DollarSign,
  Calendar,
  ExternalLink,
  Building,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react"

interface Opportunity {
  id: string
  title: string
  company: string
  location: string
  type: string
  matchScore: number
  deadline: string
  postedDate: string
  logo: string
  skills: string[]
  description: string
  salary: string
  duration: string
  remote: boolean
  applicants: number
  saved: boolean
}

interface OpportunityDetailProps {
  opportunity: Opportunity
  onToggleSave: (id: string) => void
}

export function OpportunityDetail({ opportunity, onToggleSave }: OpportunityDetailProps) {
  const userSkills = ["Python", "Machine Learning", "React", "TensorFlow", "Data Analysis", "Cloud Computing"]
  const matchedSkills = opportunity.skills.filter((skill) => userSkills.includes(skill))
  const missingSkills = opportunity.skills.filter((skill) => !userSkills.includes(skill))

  return (
    <Card className="border-border sticky top-6">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 rounded-lg">
            <AvatarImage src={opportunity.logo || "/placeholder.svg"} alt={opportunity.company} />
            <AvatarFallback className="rounded-lg text-xl">{opportunity.company[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl">{opportunity.title}</CardTitle>
            <p className="text-muted-foreground">{opportunity.company}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">{opportunity.matchScore}% Match</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Button className="flex-1 gap-1">
            <Send className="h-4 w-4" />
            Apply Now
          </Button>
          <Button variant="outline" size="icon" className="bg-transparent" onClick={() => onToggleSave(opportunity.id)}>
            {opportunity.saved ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
          </Button>
        </div>

        <Button variant="outline" className="w-full gap-2 bg-transparent">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Draft Application
        </Button>

        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Details</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {opportunity.location}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              {opportunity.salary}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {opportunity.duration}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              {opportunity.applicants} applicants
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              Due {opportunity.deadline}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4" />
              {opportunity.remote ? "Remote" : "On-site"}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Description</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{opportunity.description}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">Skill Match</h4>
            <span className="text-sm text-primary font-medium">
              {matchedSkills.length}/{opportunity.skills.length} skills
            </span>
          </div>
          <Progress value={(matchedSkills.length / opportunity.skills.length) * 100} className="h-2" />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-secondary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Matched Skills</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {matchedSkills.map((skill) => (
                <Badge key={skill} className="bg-secondary/10 text-secondary border-0 text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {missingSkills.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-amber-500">
                <AlertCircle className="h-4 w-4" />
                <span>Skills to Develop</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {missingSkills.map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border">
          <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
            <ExternalLink className="h-4 w-4" />
            View on Company Website
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
