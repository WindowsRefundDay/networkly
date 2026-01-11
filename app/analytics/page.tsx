import { getAnalyticsSummary, getProfileViewsData, getNetworkGrowthData } from "@/app/actions/analytics"
import { AnalyticsSummary } from "@/components/analytics/analytics-summary"
import { ProfileViewsChart } from "@/components/analytics/profile-views-chart"
import { NetworkGrowthChart } from "@/components/analytics/network-growth-chart"
import { SkillEndorsementsChart } from "@/components/analytics/skill-endorsements-chart"
import { AIInsights } from "@/components/analytics/ai-insights"
import { GoalsProgress } from "@/components/analytics/goals-progress"
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap"

export default async function AnalyticsPage() {
  const statsData = await getAnalyticsSummary()
  const profileViewsData = await getProfileViewsData()
  const networkGrowthData = await getNetworkGrowthData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics & Progress</h1>
        <p className="text-muted-foreground">Track your career growth and network engagement</p>
      </div>

      <AnalyticsSummary statsData={statsData} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileViewsChart data={profileViewsData} />
        <NetworkGrowthChart data={networkGrowthData} />
      </div>


      <div className="grid gap-6 lg:grid-cols-3">
        <SkillEndorsementsChart />
        <AIInsights />
        <GoalsProgress />
      </div>

      <ActivityHeatmap />
    </div>
  )
}
