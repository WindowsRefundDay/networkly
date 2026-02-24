'use client'

import Link from "next/link"
import { ArrowUpRight, Briefcase, ClockClockwise } from "@phosphor-icons/react"
import type { DashboardRecommendation } from "@/lib/dashboard/telemetry-schema"

type OpportunityPreview = {
  id: string
  title: string
  company: string
  deadline: string | null
  matchScore: number
}

export function RecommendationCard({
  recommendation,
  opportunities,
  appliedCount,
  interestedCount,
}: {
  recommendation: DashboardRecommendation | null
  opportunities: OpportunityPreview[]
  appliedCount: number
  interestedCount: number
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Top Pick</p>
          <h3 className="text-xl font-semibold text-zinc-100 tracking-tight">
            {recommendation?.title || "We are still finding your best matches"}
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            {recommendation
              ? `${recommendation.organization}${recommendation.location ? ` • ${recommendation.location}` : ""}`
              : "Check back soon or explore opportunities now."}
          </p>
        </div>
        {recommendation ? (
          <div
            className="text-right"
            style={{ fontFamily: "var(--font-dashboard-mono), monospace" }}
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Fit Score</p>
            <p className="text-3xl text-blue-400 font-semibold">{recommendation.topMatchProbability}%</p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-zinc-800/70 pt-5">
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 mb-1">Applied</p>
          <p
            className="text-2xl text-zinc-100 font-semibold"
            style={{ fontFamily: "var(--font-dashboard-mono), monospace" }}
          >
            {appliedCount}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 mb-1">Interested</p>
          <p
            className="text-2xl text-zinc-100 font-semibold"
            style={{ fontFamily: "var(--font-dashboard-mono), monospace" }}
          >
            {interestedCount}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-800/70 pt-5">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 mb-3">New Opportunities</p>
        {opportunities.length === 0 ? (
          <p className="text-sm text-zinc-500">No opportunities loaded yet. Try searching on the opportunities page.</p>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="rounded-xl border border-zinc-800/70 bg-zinc-900/35 p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-zinc-100 font-medium truncate">{opportunity.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{opportunity.company}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" weight="duotone" />
                      {Math.max(0, Math.min(100, opportunity.matchScore || 0))}% fit
                    </span>
                    {opportunity.deadline ? (
                      <span className="inline-flex items-center gap-1">
                        <ClockClockwise className="w-3.5 h-3.5" weight="duotone" />
                        {opportunity.deadline}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto pt-5 border-t border-zinc-800/70 flex justify-end">
        <Link
          href="/opportunities"
          className="text-xs text-zinc-300 hover:text-blue-400 transition-colors inline-flex items-center gap-2 uppercase tracking-[0.14em]"
          style={{ fontFamily: "var(--font-dashboard-mono), monospace" }}
        >
          View Opportunities
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
