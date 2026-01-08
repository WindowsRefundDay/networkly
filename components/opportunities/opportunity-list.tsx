"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, Clock, Sparkles, Bookmark, BookmarkCheck, Users, DollarSign, Calendar } from "lucide-react"

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

interface OpportunityListProps {
  opportunities: Opportunity[]
  onToggleSave: (id: string) => void
  onSelect: (opportunity: Opportunity) => void
  selectedId?: string
}

export function OpportunityList({ opportunities, onToggleSave, onSelect, selectedId }: OpportunityListProps) {
  const getMatchColor = (score: number) => {
    if (score >= 90) return "text-secondary bg-secondary/10"
    if (score >= 75) return "text-primary bg-primary/10"
    if (score >= 60) return "text-amber-500 bg-amber-500/10"
    return "text-muted-foreground bg-muted"
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Internship":
        return "bg-primary/10 text-primary"
      case "Fellowship":
        return "bg-secondary/10 text-secondary"
      case "Scholarship":
        return "bg-amber-500/10 text-amber-500"
      case "Competition":
        return "bg-rose-500/10 text-rose-500"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-4">
      {opportunities.map((opp) => (
        <Card
          key={opp.id}
          className={`border-border cursor-pointer transition-all hover:shadow-md ${selectedId === opp.id ? "ring-2 ring-primary" : ""}`}
          onClick={() => onSelect(opp)}
        >
          <CardContent className="p-5">
            <div className="flex gap-4">
              <Avatar className="h-14 w-14 rounded-lg shrink-0">
                <AvatarImage src={opp.logo || "/placeholder.svg"} alt={opp.company} />
                <AvatarFallback className="rounded-lg text-lg">{opp.company[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{opp.title}</h3>
                    <p className="text-muted-foreground">{opp.company}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`flex items-center gap-1 rounded-full px-3 py-1 ${getMatchColor(opp.matchScore)}`}>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="text-sm font-medium">{opp.matchScore}%</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleSave(opp.id)
                      }}
                    >
                      {opp.saved ? (
                        <BookmarkCheck className="h-5 w-5 text-primary" />
                      ) : (
                        <Bookmark className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {opp.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {opp.salary}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {opp.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {opp.applicants} applicants
                  </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">{opp.description}</p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge className={`${getTypeColor(opp.type)} border-0`}>{opp.type}</Badge>
                  {opp.remote && (
                    <Badge variant="outline" className="text-xs">
                      Remote
                    </Badge>
                  )}
                  {opp.skills.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {opp.skills.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{opp.skills.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Deadline: {opp.deadline}
                  </span>
                  <span className="text-xs text-muted-foreground">Posted {opp.postedDate}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
