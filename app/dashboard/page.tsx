import { StatsCards } from "@/components/dashboard/stats-cards"
import { OpportunityCard } from "@/components/dashboard/opportunity-card"
import { SuggestedConnections } from "@/components/dashboard/suggested-connections"
import { AIAssistantPreview } from "@/components/dashboard/ai-assistant-preview"
import { ApplicationTracker } from "@/components/dashboard/application-tracker"
import { currentUser } from "@/lib/mock-data"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {currentUser.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">Here is what is happening with your network and opportunities.</p>
      </div>

      <StatsCards />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <OpportunityCard />
          <ApplicationTracker />
        </div>
        <div className="space-y-6">
          <AIAssistantPreview />
          <SuggestedConnections />
        </div>
      </div>
    </div>
  )
}
