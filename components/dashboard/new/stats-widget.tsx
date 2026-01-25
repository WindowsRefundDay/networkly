"use client"

import { Line, LineChart, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

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
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-2 mb-8">
        <i className='bx bx-line-chart text-xl text-primary' />
        <h3 className="font-semibold text-foreground">Weekly Activity</h3>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border/40 h-full">
        <StatItem
          label="Profile Views"
          value={stats.profileViews}
          trend={stats.viewsTrend}
          data={profileViewsData}
          color="#3b82f6" // Blue
        />

        <StatItem
          label="New Connections"
          value={stats.networkGrowth}
          trend={stats.growthTrend}
          data={networkGrowthData}
          color="#3b82f6" // Blue
        />

        <StatItem
          label="Search Hits"
          value={stats.searchAppearances}
          trend={stats.searchTrend}
          data={searchAppearancesData}
          color="#3b82f6" // Blue
        />
      </div>
    </div>
  )
}

function StatItem({ label, value, trend, data, color }: any) {
  const isPositive = trend >= 0
  const hasData = data && data.length > 0

  return (
    <div className="flex flex-col justify-between px-2 md:px-3 first:pl-0 last:pr-0 w-full overflow-hidden">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase leading-tight min-h-[2.5em] flex items-center break-words">{label}</p>
        
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
          
          <div className="flex flex-col items-start gap-1">
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit",
              "text-primary bg-primary/10"
            )}>
              {isPositive ? <i className='bx bx-up-arrow-alt text-sm' /> : <i className='bx bx-down-arrow-alt text-sm' />}
              <span>{Math.abs(trend)}%</span>
            </div>
            <span className="text-[10px] text-muted-foreground pl-1">vs last week</span>
          </div>
        </div>
      </div>

      <div className="mt-6 relative h-[40px] w-full group">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                dot={false}
                strokeLinecap="round"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute bottom-0 left-0 w-full h-[2px] rounded-full opacity-20" style={{ backgroundColor: color }} />
        )}
      </div>
    </div>
  )
}
