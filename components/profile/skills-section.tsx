"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, TrendingUp, ChevronDown } from "lucide-react"
import { EditSkillsDialog } from "./dialogs"

interface SkillsSectionProps {
  skills?: string[]
  interests?: string[]
  skillEndorsements?: { skill: string; count: number }[]
}

const INITIAL_SKILLS_DISPLAY = 8
const INITIAL_INTERESTS_DISPLAY = 6

export function SkillsSection({
  skills = [],
  interests = [],
  skillEndorsements = []
}: SkillsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showAllSkills, setShowAllSkills] = useState(false)
  const [showAllInterests, setShowAllInterests] = useState(false)

  const displayedSkills = showAllSkills ? skills : skills.slice(0, INITIAL_SKILLS_DISPLAY)
  const displayedInterests = showAllInterests ? interests : interests.slice(0, INITIAL_INTERESTS_DISPLAY)
  const hasMoreSkills = skills.length > INITIAL_SKILLS_DISPLAY
  const hasMoreInterests = interests.length > INITIAL_INTERESTS_DISPLAY

  return (
    <>
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Skills & Endorsements</CardTitle>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1 bg-transparent"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {displayedSkills.map((skill) => {
              const endorsement = skillEndorsements.find((e) => e.skill === skill)
              return (
                <div key={skill} className="group relative">
                  <Badge
                    variant="secondary"
                    className={`text-sm py-1.5 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors ${endorsement ? "pr-8" : ""}`}
                  >
                    {skill}
                    {endorsement && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        {endorsement.count}
                      </span>
                    )}
                  </Badge>
                </div>
              )
            })}
            {skills.length === 0 && (
              <p className="text-sm text-muted-foreground">No skills added yet</p>
            )}
          </div>
          
          {hasMoreSkills && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setShowAllSkills(!showAllSkills)}
            >
              <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${showAllSkills ? "rotate-180" : ""}`} />
              {showAllSkills ? "Show less" : `Show ${skills.length - INITIAL_SKILLS_DISPLAY} more`}
            </Button>
          )}

          <div className="pt-2 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-2">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {displayedInterests.map((interest) => (
                <Badge key={interest} variant="outline" className="text-sm">
                  {interest}
                </Badge>
              ))}
              {interests.length === 0 && (
                <p className="text-sm text-muted-foreground">No interests added yet</p>
              )}
            </div>
            
            {hasMoreInterests && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground mt-2"
                onClick={() => setShowAllInterests(!showAllInterests)}
              >
                <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${showAllInterests ? "rotate-180" : ""}`} />
                {showAllInterests ? "Show less" : `Show ${interests.length - INITIAL_INTERESTS_DISPLAY} more`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <EditSkillsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentSkills={skills}
        currentInterests={interests}
      />
    </>
  )
}
