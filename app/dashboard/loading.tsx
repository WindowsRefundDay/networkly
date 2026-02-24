export default function DashboardLoading() {
  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-200 overflow-x-hidden relative pb-32">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(59,130,246,0.12),transparent_48%),radial-gradient(circle_at_82%_84%,rgba(59,130,246,0.08),transparent_46%),#09090b] pointer-events-none" />
      <div className="relative z-10 p-4 md:p-8 lg:p-10 max-w-[1400px] mx-auto pt-8 lg:pt-16 animate-pulse">
        <div className="mb-12 space-y-4">
          <div className="h-3 w-36 rounded-full bg-zinc-800/80" />
          <div className="h-14 w-full max-w-xl rounded-2xl bg-zinc-900/80" />
          <div className="h-3 w-56 rounded-full bg-zinc-800/80" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-8 space-y-3">
            <div className="h-72 rounded-[2rem] border border-zinc-800/80 bg-zinc-900/70" />
            <div className="h-3 w-40 rounded-full bg-zinc-800/80" />
            <div className="h-3 w-72 rounded-full bg-zinc-900/80" />
          </div>
          <div className="lg:col-span-4 space-y-3">
            <div className="h-72 rounded-[2rem] border border-zinc-800/80 bg-zinc-900/70" />
            <div className="h-3 w-40 rounded-full bg-zinc-800/80" />
            <div className="h-3 w-72 rounded-full bg-zinc-900/80" />
          </div>
          <div className="lg:col-span-8 space-y-3">
            <div className="h-72 rounded-[2rem] border border-zinc-800/80 bg-zinc-900/70" />
            <div className="h-3 w-40 rounded-full bg-zinc-800/80" />
            <div className="h-3 w-72 rounded-full bg-zinc-900/80" />
          </div>
          <div className="lg:col-span-4 space-y-3">
            <div className="h-72 rounded-[2rem] border border-zinc-800/80 bg-zinc-900/70" />
            <div className="h-3 w-40 rounded-full bg-zinc-800/80" />
            <div className="h-3 w-72 rounded-full bg-zinc-900/80" />
          </div>
          <div className="lg:col-span-12 space-y-3">
            <div className="h-56 rounded-[2rem] border border-zinc-800/80 bg-zinc-900/70" />
            <div className="h-3 w-40 rounded-full bg-zinc-800/80" />
            <div className="h-3 w-72 rounded-full bg-zinc-900/80" />
          </div>
        </div>
      </div>
    </div>
  )
}
