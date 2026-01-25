import { GlassCard } from "@/components/ui/glass-card"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowRight, Clock, MapPin, Sparkles } from "lucide-react"
import { getOpportunities } from "@/app/actions/opportunities"
import Link from "next/link"

export async function OpportunityCard() {
  const opportunities = await getOpportunities()

  return (
    <GlassCard className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Top Opportunities</CardTitle>
        <Link href="/opportunities">
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {opportunities.slice(0, 3).map((opp) => (
          <div
            key={opp.id}
            className="flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
          >
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={opp.logo || "/placeholder.svg"} alt={opp.company} />
              <AvatarFallback className="rounded-lg">{opp.company[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-foreground">{opp.title}</h4>
                  <p className="text-sm text-muted-foreground">{opp.company}</p>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-primary">{opp.matchScore}% match</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {opp.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {opp.deadline}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {opp.skills.slice(0, 3).map((skill: string) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </GlassCard>
  )
}

