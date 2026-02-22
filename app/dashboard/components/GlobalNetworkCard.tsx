'use client'

import { Activity } from "lucide-react"

export function GlobalNetworkCard({
    newMatches,
    secureMessages,
    pendingRequests
}: {
    newMatches: number
    secureMessages: number
    pendingRequests: number
}) {
    return (
        <div className="flex flex-col justify-between h-full group relative overflow-hidden">
            {/* Background elegant gradient (Google Blue accent) */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none transition-transform duration-1000 group-hover:scale-110" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 relative z-10 gap-6">
                <div>
                    <h2 className="text-xs font-mono text-zinc-500 tracking-widest uppercase mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" /> Global Network Trajectory
                    </h2>
                    <div className="flex items-baseline gap-4">
                        <span className="text-7xl md:text-8xl font-black text-zinc-100 tracking-tighter tabular-nums drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                            {newMatches.toLocaleString()}
                        </span>
                        <span className="text-xl text-zinc-500 font-medium tracking-tight">New Matches</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 w-full lg:w-3/4 mt-auto">
                <div className="p-5 rounded-2xl bg-zinc-950/50 border border-zinc-800 flex items-center justify-between group-hover:border-zinc-700 transition-colors">
                    <div>
                        <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1.5">Secure Messages</p>
                        <p className="text-3xl font-bold text-zinc-100 font-mono">{secureMessages}</p>
                    </div>
                </div>
                <div className="p-5 rounded-2xl bg-zinc-950/50 border border-zinc-800 flex items-center justify-between group-hover:border-zinc-700 transition-colors">
                    <div>
                        <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1.5">Pending Requests</p>
                        <p className="text-3xl font-bold text-zinc-100 font-mono">{pendingRequests}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
