"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface ProfileViewsChartProps {
  data?: { date: string; views: number }[]
}

export function ProfileViewsChart({ data = [] }: ProfileViewsChartProps) {
  return (
    <GlassCard className="border-border">
      <CardHeader className="pb-2 pt-6">
        <CardTitle className="text-lg font-semibold">Profile Views</CardTitle>
        <p className="text-sm text-muted-foreground">Last 7 days</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <i className="bx bx-show text-4xl mb-2 opacity-20" />
            <p className="text-sm">No profile views yet</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" stroke="hsl(var(--muted-foreground))" />
              <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorViews)"
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </GlassCard>
  )
}

