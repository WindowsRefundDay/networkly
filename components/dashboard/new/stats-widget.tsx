"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Line, LineChart, ResponsiveContainer } from "recharts"
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react"

interface StatsWidgetProps {
  stats: {
    profileViews: number
    viewsTrend: number
    networkGrowth: number
    growthTrend: number
    searchAppearances: number
    searchTrend: number
    sparklineData?: {
      profileViews: { value: number }[]
      networkGrowth: { value: number }[]
      searchAppearances: { value: number }[]
    }
  }
}

export function StatsWidget({ stats }: StatsWidgetProps) {
  const profileViewsData = stats.sparklineData?.profileViews || []
  const networkGrowthData = stats.sparklineData?.networkGrowth || []
  const searchAppearancesData = stats.sparklineData?.searchAppearances || []

  return (
    <GlassCard className="h-full">
      <div className="h-full flex flex-col justify-between p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Weekly Activity</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full" role="img" aria-label="Activity Statistics">
          <StatItem
            label="Profile Views"
            value={stats.profileViews}
            trend={stats.viewsTrend}
            data={profileViewsData}
            color="hsl(var(--primary))"
          />

          <StatItem
            label="New Connections"
            value={stats.networkGrowth}
            trend={stats.growthTrend}
            data={networkGrowthData}
            color="#10b981"
          />

          <StatItem
            label="Search Hits"
            value={stats.searchAppearances}
            trend={stats.searchTrend}
            data={searchAppearancesData}
            color="#3b82f6"
          />
        </div>
      </div>
    </GlassCard>
  )
}

function StatItem({ label, value, trend, data, color }: any) {
  const isPositive = trend >= 0
  const hasData = data && data.length > 0

  return (
    <div className="flex flex-col justify-between h-full min-h-[100px] border-r last:border-r-0 border-border/50 px-4 first:pl-0 last:pr-0">
      <div>
        <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          <span className={`text-xs font-medium flex items-center ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            {Math.abs(trend)}%
          </span>
        </div>
      </div>

      {hasData && (
        <div className="h-[50px] mt-4 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
