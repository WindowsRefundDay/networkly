import { ProfileHeader } from "@/components/profile/profile-header"
import { AboutSection } from "@/components/profile/about-section"
import { SkillsSection } from "@/components/profile/skills-section"
import { RecommendationsSection } from "@/components/profile/recommendations-section"
import { ProfileDetailsSection } from "@/components/profile/profile-details-section"
import { ProfileSidebar } from "@/components/profile/profile-sidebar"
import { GoalsTracker } from "@/components/profile/goals-tracker"
import { ProfileTimeline } from "@/components/profile/profile-timeline"
import { SkillsRadar } from "@/components/profile/skills-radar"
import { StatsCards } from "@/components/profile/stats-cards"
import { getCurrentUser, getUserAnalytics, getUserProfile } from "@/app/actions/user"
import { calculateProfileStrength } from "@/app/actions/profile"
import { getRecommendations } from "@/app/actions/recommendations"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassContainer } from "@/components/ui/glass-container"

export default async function ProfilePage() {
  const [user, analytics, recommendations, userProfile] = await Promise.all([
    getCurrentUser(),
    getUserAnalytics(),
    getRecommendations(),
    getUserProfile(),
  ])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">User not found</h2>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    )
  }

  const profileStrength = await calculateProfileStrength(user.id)
  const skillEndorsements = analytics?.skillEndorsements || []

  return (
    <div className="space-y-6 container mx-auto px-4 sm:px-6 max-w-7xl">
      {/* 1. Header Section */}
      <GlassContainer delay={0}>
        <GlassCard variant="hero" glow hover>
          <ProfileHeader user={user} userProfile={userProfile} />
        </GlassCard>
      </GlassContainer>

      {/* 2. Bento Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (Main Content) - Spans 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Section */}
          <GlassContainer delay={0.1}>
            <GlassCard hover>
              <AboutSection bio={user.bio} />
            </GlassCard>
          </GlassContainer>

          {/* Profile Details */}
          <GlassContainer delay={0.15}>
            <GlassCard hover>
              <ProfileDetailsSection userProfile={userProfile} />
            </GlassCard>
          </GlassContainer>

          {/* Unified Timeline (Achievements + Extracurriculars) */}
          <GlassContainer delay={0.2}>
            <GlassCard hover>
              <ProfileTimeline 
                achievements={user.achievements} 
                extracurriculars={user.extracurriculars} 
              />
            </GlassCard>
          </GlassContainer>

          {/* Recommendations */}
          <GlassContainer delay={0.3}>
            <GlassCard hover>
              <RecommendationsSection recommendations={recommendations} />
            </GlassCard>
          </GlassContainer>
        </div>

        {/* Right Column (Sidebar/Widgets) - Spans 1 col */}
        <div className="space-y-6">
          {/* Stats Cards (New high-impact metrics) */}
          <GlassContainer delay={0.1}>
            {/* StatsCards has its own cards, so we don't wrap in GlassCard to avoid double borders */}
            <StatsCards 
              connections={user.connections} 
              views={user.profileViews} 
              strength={profileStrength}
              growth={12} // Mock growth
            />
          </GlassContainer>

          {/* Goals Tracker */}
          <GlassContainer delay={0.2}>
            <GlassCard hover>
              <GoalsTracker />
            </GlassCard>
          </GlassContainer>

          {/* Skills Radar Visualization */}
          <GlassContainer delay={0.25}>
            <GlassCard hover>
              <SkillsRadar skills={user.skills} endorsements={skillEndorsements} />
            </GlassCard>
          </GlassContainer>

          {/* Skills List (Tags) */}
          <GlassContainer delay={0.3}>
            <GlassCard hover>
              <SkillsSection 
                skills={user.skills} 
                interests={user.interests} 
                skillEndorsements={skillEndorsements} 
              />
            </GlassCard>
          </GlassContainer>

          {/* Sidebar Links (using simplified ProfileSidebar) */}
          <GlassContainer delay={0.35}>
            {/* ProfileSidebar has cards inside, so we don't need GlassCard */}
            <ProfileSidebar
              showStrength={false}
              profileStrength={profileStrength}
              linkedinUrl={user.linkedinUrl}
              githubUrl={user.githubUrl}
              portfolioUrl={user.portfolioUrl}
            />
          </GlassContainer>
        </div>
      </div>
    </div>
  )
}
