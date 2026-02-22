import { getCurrentUser, getUserAnalytics, getUserProfile } from "@/app/actions/user"
import { getRecommendations } from "@/app/actions/recommendations"
import Link from "next/link"
import {
  Home, User as ProfileIcon, FolderGit2,
  Bot, Network, GraduationCap, Calendar,
  BarChart, Settings, Globe, Award, Briefcase,
  MapPin, Link2, Terminal, Code2, Zap, Target,
  ChevronRight, Activity, Clock
} from "lucide-react"

function calculateProfileStrengthFromUser(user: any): number {
  if (!user) return 0

  const achievements = Array.isArray(user.achievements) ? user.achievements : []
  const skills = Array.isArray(user.skills) ? user.skills : []
  const interests = Array.isArray(user.interests) ? user.interests : []

  let score = 0
  const checks = [
    { field: user.name, weight: 5 },
    { field: user.headline, weight: 10 },
    { field: user.bio, weight: 10 },
    { field: user.avatar, weight: 5 },
    { field: user.location, weight: 5 },
    { field: user.university, weight: 5 },
    { field: user.graduationYear, weight: 5 },
    { field: skills.length > 0, weight: 15 },
    { field: skills.length >= 5, weight: 5 },
    { field: interests.length > 0, weight: 10 },
    { field: achievements.length > 0, weight: 5 },
    { field: user.linkedinUrl, weight: 5 },
    { field: user.githubUrl, weight: 5 },
    { field: user.portfolioUrl, weight: 5 },
  ]

  checks.forEach(({ field, weight }) => {
    if (field) score += weight
  })

  return Math.min(score, 100)
}

async function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs = 5000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export default async function ProfilePage() {
  const [user, analytics, recommendations, userProfile] = await Promise.all([
    getCurrentUser(),
    withTimeout(getUserAnalytics(), null, 3500),
    withTimeout(getRecommendations(), [], 3500),
    withTimeout(getUserProfile(), null, 3500),
  ])

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-[#05050A]">
        <h2 className="text-xl font-mono text-red-500 bg-red-500/10 px-4 py-2 rounded-sm border border-red-500/20">SYSTEM ERROR: USER REGISTRY NOT FOUND</h2>
      </div>
    )
  }

  const profileStrength = calculateProfileStrengthFromUser(user)
  const skillEndorsements = analytics?.skillEndorsements || []

  return (
    <div className="min-h-screen bg-[#020205] text-slate-300 font-sans selection:bg-cyan-500/30 overflow-x-hidden relative pb-32">

      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[60%] bg-purple-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 p-6 md:p-8 lg:p-10 max-w-[1400px] mx-auto min-h-screen flex flex-col pt-8 lg:pt-16">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 hover:[&>div]:transition-all">

          {/* TOP HERO ROW (Span 12) */}
          <div className="lg:col-span-12 flex flex-col md:flex-row items-center md:items-start p-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent backdrop-blur-xl relative overflow-hidden group gap-8">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none transition-transform duration-1000 group-hover:scale-110" />

            <div className="relative z-10">
              <div className="h-32 w-32 md:h-40 md:w-40 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 p-[3px] shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                <div className="h-full w-full bg-[#05050A] rounded-full flex items-center justify-center overflow-hidden relative">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover opacity-90 grayscale-[20%]" />
                  ) : (
                    <span className="text-white font-bold text-5xl">{user.name.charAt(0)}</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/40 to-transparent mix-blend-overlay" />
                </div>
              </div>
            </div>

            <div className="relative z-10 flex-1 text-center md:text-left pt-2">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 tracking-tighter shadow-sm mb-2">{user.name}</h1>
                  <p className="text-lg md:text-xl text-cyan-400 font-light">{user.headline}</p>
                </div>

                <div className="flex items-center space-x-3 bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">Profile Strength</p>
                    <p className="text-xl font-bold text-white tabular-nums drop-shadow-md">{profileStrength}%</p>
                  </div>
                  <div className="w-12 h-12 relative flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#a855f7" strokeWidth="10" strokeDasharray="282.7" strokeDashoffset={282.7 - (282.7 * profileStrength) / 100} strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Badges / Links */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-6">
                {userProfile?.school && (
                  <div className="flex items-center gap-2 text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    <Briefcase className="w-4 h-4 text-slate-500" /> {userProfile.grade_level && `${userProfile.grade_level} at`} {userProfile.school}
                  </div>
                )}
                {userProfile?.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    <MapPin className="w-4 h-4 text-slate-500" /> {userProfile.location}
                  </div>
                )}
                <div className="flex gap-2">
                  {user.linkedinUrl && (
                    <a href={user.linkedinUrl} target="_blank" rel="noreferrer" className="p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 hover:text-cyan-400 transition-colors">
                      <Link2 className="w-4 h-4" />
                    </a>
                  )}
                  {user.githubUrl && (
                    <a href={user.githubUrl} target="_blank" rel="noreferrer" className="p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 hover:text-purple-400 transition-colors">
                      <Terminal className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MAIN COLUMN (Span 8) */}
          <div className="lg:col-span-8 space-y-6 lg:space-y-8">

            {/* ABOUT NODE */}
            <div className="p-8 rounded-[2rem] border border-white/5 bg-[#0A0A0F]/60 backdrop-blur-xl relative">
              <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-6 border-b border-white/5 pb-4 flex items-center gap-2">
                <Terminal className="w-4 h-4" /> /sys/user/bio
              </h3>
              <p className="text-slate-300 leading-relaxed font-light text-lg">
                {user.bio || "No synthesis data available in the current registry."}
              </p>
            </div>

            {/* TIMELINE (Achievements + Extracurriculars) */}
            <div className="p-8 rounded-[2rem] border border-white/5 bg-[#0A0A0F]/60 backdrop-blur-xl relative">
              <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-8 border-b border-white/5 pb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Event Log
              </h3>

              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-cyan-500/50 before:via-purple-500/50 before:to-transparent">
                {[...user.achievements, ...user.extracurriculars]
                  .sort((a, b) => new Date(b.date || b.startDate).getTime() - new Date(a.date || a.startDate).getTime())
                  .map((item, i) => {
                    const isAchievement = 'issuer' in item
                    const dateStr = isAchievement ? item.date : `${item.startDate} - ${item.endDate || "Present"}`
                    return (
                      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-black/80 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 group-hover:border-cyan-500/50 transition-colors">
                          {isAchievement ? <Award className="w-4 h-4 text-purple-400" /> : <Briefcase className="w-4 h-4 text-cyan-400" />}
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border border-white/5 bg-black/40 group-hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center justify-between space-x-2 mb-2">
                            <h4 className="font-bold text-white text-lg">{isAchievement ? item.title : item.role}</h4>
                            <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">{dateStr}</span>
                          </div>
                          <p className="text-sm text-cyan-400/80 mb-3">{isAchievement ? item.issuer : item.organization}</p>
                          <p className="text-sm text-slate-400 font-light leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* RECOMMENDATIONS */}
            <div className="p-8 rounded-[2rem] border border-white/5 bg-[#0A0A0F]/60 backdrop-blur-xl relative">
              <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-6 border-b border-white/5 pb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Peer Endorsements
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.length > 0 ? recommendations.map((rec) => (
                  <div key={rec.id} className="p-6 rounded-2xl border border-white/5 bg-black/40 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-4 mb-4">
                      <img src={rec.avatar || "/placeholder.svg"} alt={rec.author} className="w-10 h-10 rounded-full grayscale border border-white/10" />
                      <div>
                        <h4 className="font-bold text-slate-200">{rec.author}</h4>
                        <p className="text-xs text-slate-500 font-mono">{rec.role}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 italic">"{rec.content}"</p>
                  </div>
                )) : (
                  <p className="text-slate-500 font-mono text-sm col-span-2 text-center py-8">NO ENDORSEMENTS DETECTED.</p>
                )}
              </div>
            </div>

          </div>

          {/* SIDEBAR COLUMN (Span 4) */}
          <div className="lg:col-span-4 space-y-6 lg:space-y-8">

            {/* STATS MODULE */}
            <div className="p-6 rounded-[2rem] border border-white/5 bg-[#0A0A0F]/60 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-[40px] pointer-events-none" />
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Network Nodes</p>
                  <p className="text-3xl font-black text-white">{user.connections}</p>
                </div>
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Profile Queries</p>
                  <p className="text-3xl font-black text-white">{user.profileViews}</p>
                </div>
              </div>
            </div>

            {/* SKILLS SYNTHESIS GRID */}
            <div className="p-8 rounded-[2rem] border border-white/5 bg-[#0A0A0F]/60 backdrop-blur-xl relative">
              <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-6 border-b border-white/5 pb-4 flex items-center gap-2">
                <Code2 className="w-4 h-4" /> Capabilities
              </h3>

              <div className="flex flex-wrap gap-2">
                {(Array.isArray(user.skills) ? user.skills : []).map((skill: any, index: number) => {
                  const skillName = typeof skill === "string" ? skill : skill?.name
                  const skillId = typeof skill === "object" ? skill?.id : undefined
                  const endorsementCount = skillEndorsements.find(e => e.skill === skillName || e.skill === skillId)?.count || 0;
                  return (
                    <div key={skillId || skillName || `skill-${index}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-black/40 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-cyan-400 transition-colors cursor-default">
                      {skillName || "Unknown Skill"}
                      {endorsementCount > 0 && (
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-mono">{endorsementCount}</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {user.interests && user.interests.length > 0 && (
                <>
                  <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest mt-8 mb-6 border-b border-white/5 pb-4 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Areas of Interest
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map(interest => (
                      <span key={interest} className="px-3 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 text-sm font-medium text-purple-300/80 cursor-default hover:text-purple-300 transition-colors">
                        {interest}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* INNOVATIVE FLOATING NAVIGATION (BOTTOM DOCK) */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-full border border-white/10 bg-[#0A0A0F]/80 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] supports-[backdrop-filter]:bg-black/40">

          {[
            { label: "Home", icon: Home, active: false, href: "/dashboard" },
            { label: "Profile", icon: ProfileIcon, active: true, href: "/profile" },
            { label: "Opportunities", icon: Globe, active: false, href: "/opportunities" },
            { label: "Projects", icon: FolderGit2, active: false, href: "/projects" },
            { label: "Network", icon: Network, active: false, href: "/network" },
            { label: "Mentors", icon: GraduationCap, active: false, href: "/mentors" },
            { label: "Events", icon: Calendar, active: false, href: "/events" },
            { label: "Analytics", icon: BarChart, active: false, href: "/analytics" },
            { label: "Settings", icon: Settings, active: false, href: "/settings" },
          ].map((item, i) => (
            <div key={i} className={`relative group ${i > 4 ? 'hidden sm:block' : 'block'}`}>
              <Link href={item.href || '#'} className={`block p-2.5 md:p-3 rounded-full transition-all duration-300 relative ${item.active ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                {item.active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)]" />
                )}
              </Link>
              {/* Tooltip */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-md bg-black border border-white/10 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {item.label}
              </div>
            </div>
          ))}

          <div className="hidden sm:block w-px h-6 bg-white/10 mx-1 md:mx-2" />

          {/* Primary AI Assistant Action in Dock */}
          <button className="relative group flex items-center justify-center p-2.5 md:p-3 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all ml-1 sm:ml-0">
            <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-md bg-black border border-purple-500/30 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              AI Assistant
            </div>
          </button>

        </div>
      </nav>

    </div>
  )
}
