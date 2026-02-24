'use client'

import { TrendUp } from "@phosphor-icons/react"

export function GlobalNetworkCard({
  projectCount,
  completedProjects,
  inProgressProjects,
  averageProjectProgress,
  recentProjects,
}: {
  projectCount: number
  completedProjects: number
  inProgressProjects: number
  averageProjectProgress: number
  recentProjects: Array<{
    id: string
    title: string
    status: string
    progress: number
  }>
}) {
  return (
    <div className="flex flex-col justify-between h-full group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[340px] h-[340px] bg-blue-500/10 rounded-full blur-[95px] -translate-y-1/2 translate-x-1/2 pointer-events-none transition-transform duration-1000 group-hover:scale-110" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 relative z-10 gap-6">
        <div>
          <h2 className="text-[11px] text-zinc-500 tracking-[0.18em] uppercase mb-5 flex items-center gap-2">
            <TrendUp className="w-4 h-4 text-blue-400" weight="duotone" />
            Project Snapshot
          </h2>
          <div className="flex items-baseline gap-4">
            <span
              className="text-7xl md:text-8xl font-semibold text-zinc-100 tracking-tighter tabular-nums"
              style={{ fontFamily: "var(--font-dashboard-mono), monospace" }}
            >
              {projectCount.toLocaleString()}
            </span>
            <span className="text-lg text-zinc-500 font-medium tracking-tight">projects</span>
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            Average progress:{" "}
            <span className="text-zinc-200 font-medium">{Math.max(0, Math.min(100, averageProjectProgress))}%</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-zinc-800/80 pt-6 relative z-10">
        <div className="py-3">
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.16em] mb-2">In Progress</p>
          <p
            className="text-3xl font-semibold text-zinc-100 tabular-nums"
            style={{ fontFamily: "var(--font-dashboard-mono), monospace" }}
          >
            {inProgressProjects}
          </p>
        </div>
        <div className="py-3 sm:pl-6 border-t sm:border-t-0 sm:border-l border-zinc-800/80">
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.16em] mb-2">Completed</p>
          <p
            className="text-3xl font-semibold text-zinc-100 tabular-nums"
            style={{ fontFamily: "var(--font-dashboard-mono), monospace" }}
          >
            {completedProjects}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-800/80 pt-5 space-y-3">
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.16em]">Recent Projects</p>
        {recentProjects.length === 0 ? (
          <p className="text-sm text-zinc-500">No projects yet. Start one to track your progress here.</p>
        ) : (
          <div className="space-y-3">
            {recentProjects.map((project) => {
              const safeProgress = Math.max(0, Math.min(100, project.progress || 0))
              return (
                <div key={project.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-zinc-200 truncate">{project.title}</p>
                    <p
                      className="text-[11px] text-zinc-500 uppercase tracking-[0.12em]"
                      style={{ fontFamily: "var(--font-dashboard-mono), monospace" }}
                    >
                      {safeProgress}%
                    </p>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.max(3, safeProgress)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
