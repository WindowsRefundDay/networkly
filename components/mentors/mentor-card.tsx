"use client"

import { Mentor } from "@/app/actions/mentors"
import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, Mail, ExternalLink, GraduationCap, MapPin, Bookmark, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { EmailTemplateModal } from "@/components/mentors/email-template-modal"

interface MentorCardProps {
  mentor: Mentor
  onSave: (id: string) => void
  isSaved?: boolean
}

export function MentorCard({ mentor, onSave, isSaved = false }: MentorCardProps) {
  const [showEmailModal, setShowEmailModal] = useState(false)

  return (
    <>
    <GlassCard className="flex flex-col h-full hover:border-primary/50 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary">
              {mentor.name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">{mentor.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="line-clamp-1">{mentor.title}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span className="line-clamp-1">{mentor.institution}</span>
            </div>
          </div>
        </div>
        {mentor.matchScore > 0 && (
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 whitespace-nowrap">
            {Math.round(mentor.matchScore)}% Match
          </Badge>
        )}
      </div>

      <div className="space-y-4 flex-1">
        {mentor.researchAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mentor.researchAreas.slice(0, 3).map((area, i) => (
              <Badge key={i} variant="outline" className="text-xs font-normal">
                {area}
              </Badge>
            ))}
            {mentor.researchAreas.length > 3 && (
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                +{mentor.researchAreas.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {mentor.bio && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {mentor.bio}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-2"
          onClick={() => onSave(mentor.id)}
          disabled={isSaved}
        >
          <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
          {isSaved ? "Saved" : "Save"}
        </Button>
        
        {mentor.email && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowEmailModal(true)} title="Generate AI Draft">
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={`mailto:${mentor.email}`} title="Email Mentor">
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
        
        {mentor.profileUrl && (
          <Button variant="ghost" size="icon" asChild>
            <a href={mentor.profileUrl} target="_blank" rel="noopener noreferrer" title="View Profile">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </GlassCard>

    <EmailTemplateModal 
      mentorId={mentor.id}
      mentorName={mentor.name}
      open={showEmailModal}
      onOpenChange={setShowEmailModal}
    />
    </>
  )
}
