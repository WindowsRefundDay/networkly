"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface SkillEndorsementsChartProps {
  data?: { skill: string; count: number }[]
}

const colors = ["hsl(var(--primary))"]

export function SkillEndorsementsChart({ data = [] }: SkillEndorsementsChartProps) {
  return (
    <GlassCard className="border-border">
      <CardHeader className="pb-2 pt-6">
        <CardTitle className="text-lg font-semibold">Skill Endorsements</CardTitle>
        <p className="text-sm text-muted-foreground">Top 5 skills</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <i className="bx bx-medal text-4xl mb-2 opacity-20" />
            <p className="text-sm">No skill endorsements yet</p>
          </div>
        ) : (
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
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </GlassCard>
  )
}

