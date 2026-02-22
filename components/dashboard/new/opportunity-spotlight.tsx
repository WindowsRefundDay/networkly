"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, MapPin, DollarSign, ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

interface OpportunitySpotlightProps {
  opportunity: {
    id: string
    title: string
    company: string
    location: string
    type: string
    salary?: string | null
    logo?: string | null
    matchScore: number
    matchReasons: string[]
  } | null
}

export function OpportunitySpotlight({ opportunity }: OpportunitySpotlightProps) {
  if (!opportunity) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-card">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No recommendations yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Complete your profile skills and interests to get personalized AI recommendations.
        </p>
        <Link href="/profile">
          <Button variant="outline">Update Profile</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col md:flex-row bg-card p-6 gap-6 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-primary/10 transition-colors duration-500" />

      <div className="flex-1 z-10">
        <div className="flex items-start justify-between mb-4">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            <Sparkles className="w-3 h-3 mr-1" />
            Top Match: {opportunity.matchScore}%
          </Badge>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {opportunity.type}
          </span>
        </div>

        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border">
            {opportunity.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={opportunity.logo} alt={opportunity.company} className="w-8 h-8 object-contain" />
            ) : (
              <Building2 className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
              {opportunity.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {opportunity.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {opportunity.location}
              </span>
              {opportunity.salary && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {opportunity.salary}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Why this fits you:</p>
          <div className="flex flex-wrap gap-2">
            {opportunity.matchReasons.slice(0, 3).map((reason, i) => (
              <Badge key={i} variant="secondary" className="font-normal text-xs bg-muted/50">
                {reason}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-end items-start md:items-end gap-3 md:min-w-[140px] z-10 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6">
        <Link href={`/opportunities/${opportunity.id}`} className="w-full">
          <Button className="w-full gap-2 group-hover:translate-x-1 transition-transform">
            View Details
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
          Save for Later
        </Button>
      </div>
    </div>
  )
}
