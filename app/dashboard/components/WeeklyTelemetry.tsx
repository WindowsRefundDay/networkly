'use client'

import Link from "next/link"
import { ArrowUpRight } from "@phosphor-icons/react"

export function WeeklyTelemetry({
  projectsInProgress,
  opportunitiesApplied,
  mentorsSaved,
  profileCompletion,
}: {
  projectsInProgress: number
  opportunitiesApplied: number
  mentorsSaved: number
  profileCompletion: number
}) {
  const safeProfileCompletion = Math.max(0, Math.min(100, profileCompletion))

  const steps = [
    {
      title: projectsInProgress > 0 ? "Keep your project momentum" : "Start your first project",
      detail:
        projectsInProgress > 0
          ? `${projectsInProgress} project${projectsInProgress === 1 ? "" : "s"} in progress right now.`
          : "A project makes your profile stand out quickly.",
      href: "/projects",
      cta: projectsInProgress > 0 ? "Open Projects" : "Create Project",
    },
    {
      title: opportunitiesApplied > 0 ? "Follow up on your applications" : "Apply to an opportunity",
      detail:
        opportunitiesApplied > 0
          ? `${opportunitiesApplied} application${opportunitiesApplied === 1 ? "" : "s"} submitted.`
          : "One application this week is a great goal.",
      href: "/opportunities",
      cta: "View Opportunities",
    },
    {
      title: mentorsSaved > 0 ? "Reach out to a mentor" : "Find your first mentor",
      detail:
        mentorsSaved > 0
          ? `${mentorsSaved} mentor${mentorsSaved === 1 ? "" : "s"} saved to your list.`
          : "Mentors can help with projects and applications.",
      href: "/mentors",
      cta: "Open Mentors",
    },
  ]

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex items-start justify-between gap-6 border-b border-zinc-800/60 pb-5">
        <div>
          <h3 className="text-xl font-semibold text-zinc-100 tracking-tight">Your Next Steps</h3>
          <p className="text-sm text-zinc-500 mt-1">Small moves each week lead to big results.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Profile Completion</p>
          <p
            className="text-3xl text-zinc-100 font-semibold"
            style={{ fontFamily: "var(--font-dashboard-mono), monospace" }}
          >
            {safeProfileCompletion}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {steps.map((step) => (
          <div key={step.title} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/35 p-5 flex flex-col">
            <p className="text-sm font-medium text-zinc-100">{step.title}</p>
            <p className="text-xs text-zinc-500 leading-relaxed mt-2 flex-1">{step.detail}</p>
            <Link
              href={step.href}
              className="mt-4 inline-flex items-center gap-2 text-xs text-zinc-300 hover:text-blue-400 transition-colors uppercase tracking-[0.13em]"
              style={{ fontFamily: "var(--font-dashboard-mono), monospace" }}
            >
              {step.cta}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
