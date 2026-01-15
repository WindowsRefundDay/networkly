import { ProfileHeader } from "@/components/profile/profile-header"
import { AboutSection } from "@/components/profile/about-section"
import { ExtracurricularsSection } from "@/components/profile/extracurriculars-section"
import { SkillsSection } from "@/components/profile/skills-section"
import { AchievementsSection } from "@/components/profile/achievements-section"
import { RecommendationsSection } from "@/components/profile/recommendations-section"
import { ProfileSidebar } from "@/components/profile/profile-sidebar"
import { GoalsTracker } from "@/components/profile/goals-tracker"
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
    <div className="space-y-6">
      <GlassContainer delay={0}>
        <GlassCard variant="hero" glow>
          <ProfileHeader user={user} userProfile={userProfile} />
        </GlassCard>
      </GlassContainer>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <GlassContainer delay={0.1}>
            <GlassCard>
              <GoalsTracker />
            </GlassCard>
          </GlassContainer>

          <GlassContainer delay={0.15}>
            <GlassCard>
              <AchievementsSection achievements={user.achievements} />
            </GlassCard>
          </GlassContainer>

          <GlassContainer delay={0.2}>
            <GlassCard>
              <AboutSection bio={user.bio} />
            </GlassCard>
          </GlassContainer>

          <GlassContainer delay={0.25}>
            <GlassCard>
              <ExtracurricularsSection extracurriculars={user.extracurriculars} />
            </GlassCard>
          </GlassContainer>

          <GlassContainer delay={0.3}>
            <GlassCard>
              <SkillsSection skills={user.skills} interests={user.interests} skillEndorsements={skillEndorsements} />
            </GlassCard>
          </GlassContainer>

          <GlassContainer delay={0.35}>
            <GlassCard>
              <RecommendationsSection recommendations={recommendations} />
            </GlassCard>
          </GlassContainer>
        </div>

        <div className="space-y-6">
          <GlassContainer delay={0.15}>
            <GlassCard variant="sidebar">
              <ProfileSidebar
                profileStrength={profileStrength}
                linkedinUrl={user.linkedinUrl}
                githubUrl={user.githubUrl}
                portfolioUrl={user.portfolioUrl}
              />
            </GlassCard>
          </GlassContainer>
        </div>
      </div>
    </div>
  )
}
