"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface NetworkGrowthChartProps {
  data?: { month: string; connections: number }[]
}

export function NetworkGrowthChart({ data = [] }: NetworkGrowthChartProps) {
  return (
    <GlassCard className="border-border">
      <CardHeader className="pb-2 pt-6">
        <CardTitle className="text-lg font-semibold">Network Growth</CardTitle>
        <p className="text-sm text-muted-foreground">Last 5 months</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <i className="bx bx-network-chart text-4xl mb-2 opacity-20" />
            <p className="text-sm">No network growth data yet</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" stroke="hsl(var(--muted-foreground))" />
                <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="connections"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </GlassCard>
  )
}

