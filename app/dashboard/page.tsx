import { StatsCards } from "@/components/dashboard/stats-cards"
import { OpportunityCard } from "@/components/dashboard/opportunity-card"
import { SuggestedConnections } from "@/components/dashboard/suggested-connections"
import { AIAssistantPreview } from "@/components/dashboard/ai-assistant-preview"
import { ApplicationTracker } from "@/components/dashboard/application-tracker"
import { CuratedOpportunitiesWidget } from "@/components/dashboard/curated-opportunities-widget"
import { getCurrentUser, syncUserFromClerk } from "@/app/actions/user"
import { getAnalyticsSummary } from "@/app/actions/analytics"
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  let dbUser = await getCurrentUser()



  // If user is authenticated with Clerk but not in our DB, sync them
  if (!dbUser) {
    const clerkUser = await currentUser()

    if (!clerkUser) {
      // Not logged in at all, redirect to login
      redirect("/login")
    }

    // Sync the Clerk user to our database
    await syncUserFromClerk({
      id: clerkUser.id,
      emailAddresses: clerkUser.emailAddresses,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    })

    // Fetch the newly created user
    dbUser = await getCurrentUser()
  }

  // If still no user after sync attempt, show error
  if (!dbUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h2 className="text-xl font-semibold text-destructive">Failed to set up account</h2>
        <p className="text-muted-foreground text-center max-w-xs">
          Please try refreshing the page or contact support.
        </p>
      </div>
    )
  }

  // Fetch stats after ensuring user exists
  const statsData = await getAnalyticsSummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {dbUser.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">Here is what is happening with your network and opportunities.</p>
      </div>

      <StatsCards statsData={statsData} />


      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <OpportunityCard />
          <ApplicationTracker />
        </div>
        <div className="space-y-6">
          <CuratedOpportunitiesWidget />
          <AIAssistantPreview />
          <SuggestedConnections />
        </div>
      </div>
    </div>
  )
}
