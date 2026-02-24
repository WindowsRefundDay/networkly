import { redirect } from "next/navigation"

import { getDashboardData } from "@/app/actions/dashboard"
import { getSuggestedMentors, getSavedMentors } from "@/app/actions/mentors"
import { getOpportunities } from "@/app/actions/opportunities"
import { getStatuses } from "@/app/actions/opportunity-status"
import { getMyProjects } from "@/app/actions/projects"
import { ensureUserRecord } from "@/app/actions/user"

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
          <h2 className="text-xl text-zinc-100 px-4 py-2 rounded-sm border border-zinc-800/80 bg-zinc-900/60">
            We could not load your dashboard yet.
          </h2>
          <p className="text-zinc-500 text-sm">
            Please refresh in a moment.
          </p>
        </div>
      )
    }
  }

  const [myProjects, opportunitiesResult, opportunityStatuses, suggestedMentors, savedMentors] = await Promise.all([
    getMyProjects(),
    getOpportunities({ page: 1, pageSize: 6 }),
    getStatuses(),
    getSuggestedMentors(),
    getSavedMentors(),
  ])

  const completedProjects = myProjects.filter((project) => {
    const normalized = project.status.toLowerCase()
    return project.progress >= 100 || normalized.includes("complete") || normalized.includes("done")
  }).length

  const inProgressProjects = myProjects.filter((project) => {
    const normalized = project.status.toLowerCase()
    return (
      (project.progress > 0 && project.progress < 100) ||
      normalized.includes("progress") ||
      normalized.includes("active") ||
      normalized.includes("building")
    )
  }).length

  const averageProjectProgress = myProjects.length
    ? Math.round(
        myProjects.reduce((sum, project) => sum + Math.min(100, Math.max(0, project.progress || 0)), 0) /
          myProjects.length
      )
    : 0

  const statusValues = Object.values(opportunityStatuses)
  const opportunityStatusCounts = {
    interested: statusValues.filter((status) => status === "interested").length,
    applied: statusValues.filter((status) => status === "applied").length,
  }

  const metrics = {
    projectCount: myProjects.length,
    completedProjects,
    inProgressProjects,
    averageProjectProgress,
    mentorSavedCount: savedMentors.length,
    completionPercentage: data.user.profileCompleteness,
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-200 font-sans selection:bg-blue-500/20 overflow-x-hidden relative pb-32">

      <div className="fixed inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(59,130,246,0.14),transparent_48%),radial-gradient(circle_at_82%_84%,rgba(59,130,246,0.1),transparent_46%),#09090b] z-0 pointer-events-none" />

      <DashboardMotionShell>
        <div className="relative z-10 p-4 md:p-8 lg:p-10 max-w-[1400px] mx-auto flex flex-col pt-8 lg:pt-16">

          <DashboardHeader name={data.user.name} />

          <BentoGrid>

            <BentoItem
              colSpan="lg:col-span-8"
              label="Projects"
              description="What you are building right now."
            >
              <GlobalNetworkCard
                projectCount={metrics.projectCount}
                completedProjects={metrics.completedProjects}
                inProgressProjects={metrics.inProgressProjects}
                averageProjectProgress={metrics.averageProjectProgress}
                recentProjects={myProjects.slice(0, 3)}
              />
            </BentoItem>

            <BentoItem
              colSpan="lg:col-span-4"
              className="items-center text-center"
              label="Mentors"
              description="People who can help you level up."
            >
              <ProfileSynthesisCard
                savedMentorCount={metrics.mentorSavedCount}
                suggestedMentors={suggestedMentors.slice(0, 3)}
              />
            </BentoItem>

            <BentoItem
              colSpan="lg:col-span-8"
              label="Opportunities"
              description="Open programs and internships you can apply to."
            >
              <RecommendationCard
                recommendation={data.recommendation}
                opportunities={opportunitiesResult.opportunities.slice(0, 3)}
                appliedCount={opportunityStatusCounts.applied}
                interestedCount={opportunityStatusCounts.interested}
              />
            </BentoItem>

            <BentoItem
              colSpan="lg:col-span-4"
              label="Quick Actions"
              description="Jump to your most used pages."
            >
              <QuickActionsContainer />
            </BentoItem>

            <BentoItem
              colSpan="lg:col-span-12"
              label="What To Do Next"
              description="Simple next steps based on your current progress."
            >
              <WeeklyTelemetry
                projectsInProgress={metrics.inProgressProjects}
                opportunitiesApplied={opportunityStatusCounts.applied}
                mentorsSaved={metrics.mentorSavedCount}
                profileCompletion={metrics.completionPercentage}
              />
            </BentoItem>
          </BentoGrid>
        </div>

        <ActionDock />
      </DashboardMotionShell>
    </div>
  )
}
