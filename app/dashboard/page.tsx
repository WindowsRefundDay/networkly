import { getDashboardData } from "@/app/actions/dashboard"
import { ensureUserRecord } from "@/app/actions/user"
import { redirect } from "next/navigation"

// Next.js Server Component
import { DashboardMotionShell } from "./components/DashboardMotionShell"
import { DashboardHeader } from "./components/DashboardHeader"
import { BentoGrid, BentoItem } from "./components/BentoGrid"
import { GlobalNetworkCard } from "./components/GlobalNetworkCard"
import { ProfileSynthesisCard } from "./components/ProfileSynthesisCard"
import { RecommendationCard } from "./components/RecommendationCard"
import { QuickActionsContainer } from "./components/QuickActionsContainer"
import { WeeklyTelemetry } from "./components/WeeklyTelemetry"
import { ActionDock } from "./components/ActionDock"

export default async function DashboardPage() {
  let data = await getDashboardData()

  // Authentication Check
  if (!data) {
    const ensuredUser = await ensureUserRecord()
    if (!ensuredUser) {
      redirect("/login")
    }
    data = await getDashboardData()
    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] space-y-4 bg-zinc-950">
          <h2 className="text-xl font-mono text-red-500 bg-red-500/10 px-4 py-2 rounded-sm border border-red-500/20">SYSTEM ERROR: CONNECTION REFUSED</h2>
          <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">
            RETRYING HANDSHAKE...
          </p>
        </div>
      )
    }
  }

  const metrics = {
    newMatches: data.monumentalMetrics.matches,
    secureMessages: data.monumentalMetrics.unreadMessages,
    pendingRequests: data.monumentalMetrics.pendingRequests,
    completionPercentage: data.user.profileCompleteness,
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-300 font-sans selection:bg-blue-500/30 overflow-x-hidden relative pb-32">

      {/* Absolute Solid Background base */}
      <div className="fixed inset-0 bg-[#060608] z-0 pointer-events-none" />

      <DashboardMotionShell>
        {/* Grid Layout Container */}
        <div className="relative z-10 p-6 md:p-8 lg:p-10 max-w-[1400px] mx-auto flex flex-col pt-8 lg:pt-16">

          {/* Isolated Client Header */}
          <DashboardHeader name={data.user.name} />

          {/* Bento Grid layout Engine */}
          <BentoGrid>

            {/* ROW 1: Hero Metrics & Profile */}
            <BentoItem colSpan="lg:col-span-8">
              <GlobalNetworkCard
                newMatches={metrics.newMatches}
                secureMessages={metrics.secureMessages}
                pendingRequests={metrics.pendingRequests}
              />
            </BentoItem>

            <BentoItem colSpan="lg:col-span-4" className="items-center text-center">
              <ProfileSynthesisCard completionPercentage={metrics.completionPercentage} />
            </BentoItem>

            {/* ROW 2: Algorithmic Curation & Quick Actions */}
            <BentoItem colSpan="lg:col-span-8">
              <RecommendationCard recommendation={data.recommendation} />
            </BentoItem>

            {/* Quick actions don't need a bento item wrap directly, we wrap them so they stagger internally or match height */}
            <div className="lg:col-span-4 w-full h-full relative z-10">
              <QuickActionsContainer />
            </div>

            {/* ROW 3: Telemetry */}
            <BentoItem colSpan="lg:col-span-12">
              <WeeklyTelemetry
                profileViews7d={data.weeklyTelemetry.profileViews7d}
                newConnections7d={data.weeklyTelemetry.newConnections7d}
                searchAppearancesTotal={data.user.searchAppearancesTotal}
              />
            </BentoItem>

          </BentoGrid>

        </div>

        {/* Floating Action Dock */}
        <ActionDock />
      </DashboardMotionShell>

    </div>
  )
}
