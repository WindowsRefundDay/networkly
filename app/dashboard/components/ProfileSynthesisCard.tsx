'use client'

import { UsersThree } from "@phosphor-icons/react"

type SuggestedMentor = {
  id: string
  name: string
  institution: string
  researchAreas: string[]
}

export function ProfileSynthesisCard({
  savedMentorCount,
  suggestedMentors,
}: {
  savedMentorCount: number
  suggestedMentors: SuggestedMentor[]
}) {
  return (
    <div className="flex flex-col relative h-full w-full">
      <h3 className="text-[11px] text-zinc-500 tracking-[0.18em] uppercase w-full text-left">
        Mentors For You
      </h3>

      <div className="mt-6 rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-5">
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.16em] mb-2">Saved Mentors</p>
        <p
          className="text-4xl font-semibold text-zinc-100 tabular-nums"
          style={{ fontFamily: "var(--font-dashboard-mono), monospace" }}
        >
          {savedMentorCount}
        </p>
      </div>

      <div className="mt-4 border-t border-zinc-800/80 pt-4">
        {suggestedMentors.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-4 text-left">
            <p className="text-sm text-zinc-300 mb-1">No mentor suggestions yet</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Add interests in your profile to get mentor matches.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestedMentors.map((mentor) => (
              <div
                key={mentor.id}
                className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-4 text-left"
              >
                <p className="text-sm font-medium text-zinc-100">{mentor.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{mentor.institution || "Institution not listed"}</p>
                {mentor.researchAreas.length > 0 ? (
                  <p className="text-[11px] text-blue-300 mt-2 truncate">{mentor.researchAreas[0]}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-800/70 text-left">
        <p className="text-xs text-zinc-400 flex items-center gap-2 uppercase tracking-[0.14em]">
          <UsersThree className="w-3.5 h-3.5 text-blue-400" weight="duotone" />
          Keep Building Your Network
        </p>
      </div>
    </div>
  )
}
