"use client"

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "next-themes"

interface SkillsRadarProps {
  skills: string[]
  endorsements: { skill: string; count: number }[]
}

export function SkillsRadar({ skills, endorsements }: SkillsRadarProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  // Process data for the chart
  // If we have endorsements, use them. Otherwise, give a default value to skills.
  // We'll take the top 6 skills to keep the radar chart clean.
  
  const allSkills = Array.from(new Set([...skills, ...endorsements.map(e => e.skill)]))
  
  const data = allSkills.slice(0, 6).map(skill => {
    const endorsement = endorsements.find(e => e.skill === skill)
    return {
      subject: skill,
      A: endorsement ? endorsement.count : 1, // Default to 1 if just listed
      fullMark: Math.max(...endorsements.map(e => e.count), 5) // Scale based on max
    }
  })

  // If no data, show a placeholder or empty state
  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Skills Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground">
          No skills added yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full border-0 shadow-none bg-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Skill Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", fontSize: 12 }} 
              />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
              <Radar
                name="Endorsements"
                dataKey="A"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
