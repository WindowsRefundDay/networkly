"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface SkillEndorsementsChartProps {
  data?: { skill: string; count: number }[]
}

const colors = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(38, 92%, 50%)",
  "hsl(346, 77%, 50%)",
  "hsl(262, 83%, 58%)",
]

export function SkillEndorsementsChart({ data = [] }: SkillEndorsementsChartProps) {
  return (
    <GlassCard className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Skill Endorsements</CardTitle>
        <p className="text-sm text-muted-foreground">Top 5 skills</p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" className="text-xs" stroke="hsl(var(--muted-foreground))" />
              <YAxis
                dataKey="skill"
                type="category"
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </GlassCard>
  )
}

