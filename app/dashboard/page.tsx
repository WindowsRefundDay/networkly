import { BentoGrid, BentoItem } from "@/components/dashboard/new/bento-grid"
import { HeroSection } from "@/components/dashboard/new/hero-section"
import { StatsWidget } from "@/components/dashboard/new/stats-widget"
import { QuickActionsWidget } from "@/components/dashboard/new/quick-actions"
import { ActivityFeed } from "@/components/dashboard/new/activity-feed"
import { OpportunitySpotlight } from "@/components/dashboard/new/opportunity-spotlight"
import { getDashboardData } from "@/app/actions/dashboard"
import { redirect } from "next/navigation"
import { ensureUserRecord } from "@/app/actions/user"
import { GlassCard } from "@/components/ui/glass-card"

export default async function DashboardPage() {
  let data = await getDashboardData()
  
  if (!data) {
    const ensuredUser = await ensureUserRecord()
    if (!ensuredUser) {
      redirect("/login")
    }

    // Retry fetching dashboard data
    data = await getDashboardData()

    // If still failing, show error state
    if (!data) {
      return (
        <div className="space-y-6 container mx-auto px-4 sm:px-6 max-w-7xl py-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <h2 className="type-h4 text-destructive">Failed to set up account</h2>
            <p className="type-muted text-center max-w-xs">
              Please try refreshing the page or contact support.
            </p>
          </div>
        </div>
      )
    }
  }

  // Extend analytics stats with mock trend data until implemented in backend
  const extendedStats = {
    profileViews: data.stats.profileViews.value,
    networkGrowth: data.stats.connections.value,
    searchAppearances: data.stats.searchAppearances.value,
    viewsTrend: 15,
    growthTrend: 8,
    searchTrend: -2,
    sparklineData: data.stats.sparklineData
  }

  return (
    <div className="space-y-6 container mx-auto px-4 sm:px-6 max-w-7xl py-6">
      <BentoGrid>
        {/* Hero Section - Top Left Priority */}
        <BentoItem colSpan={{ md: 4, lg: 8 }} className="min-h-[300px]">
          <HeroSection 
            user={data.user} 
            dailyDigest={data.dailyDigest} 
          />
        </BentoItem>

        {/* Quick Actions & Stats - Top Right Split */}
        <BentoItem colSpan={{ md: 2, lg: 4 }} variant="ghost" className="min-h-[300px]">
          <div className="grid grid-rows-2 h-full gap-6">
             <QuickActionsWidget />
             <StatsWidget stats={extendedStats} />
          </div>
        </BentoItem>

        {/* Opportunity Spotlight - Middle Full Width */}
        <BentoItem colSpan={{ md: 6, lg: 12 }} className="min-h-[250px]">
           <OpportunitySpotlight opportunity={data.spotlightOpportunity} />
        </BentoItem>

        {/* Activity Feed - Bottom Left */}
        <BentoItem colSpan={{ md: 3, lg: 8 }} className="min-h-[400px]">
           <ActivityFeed activities={data.recentActivities} />
        </BentoItem>

        {/* Applications - Bottom Right */}
        <BentoItem colSpan={{ md: 3, lg: 4 }} className="min-h-[400px] flex items-center justify-center">
           <p className="text-muted-foreground">Application Tracker Coming Soon</p>
        </BentoItem>
      </BentoGrid>
    </div>
  )
}
