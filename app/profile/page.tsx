import { ProfileHeader } from "@/components/profile/profile-header"
import { AboutSection } from "@/components/profile/about-section"
import { ExtracurricularsSection } from "@/components/profile/extracurriculars-section"
import { SkillsSection } from "@/components/profile/skills-section"
import { AchievementsSection } from "@/components/profile/achievements-section"
import { RecommendationsSection } from "@/components/profile/recommendations-section"
import { ProfileSidebar } from "@/components/profile/profile-sidebar"

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <ProfileHeader />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AboutSection />
          <ExtracurricularsSection />
          <SkillsSection />
          <AchievementsSection />
          <RecommendationsSection />
        </div>
        <div>
          <ProfileSidebar />
        </div>
      </div>
    </div>
  )
}
