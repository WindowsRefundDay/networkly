'use client'

import { Calendar } from "lucide-react"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export function DashboardHeader({ name }: { name: string }) {
    const [mounted, setMounted] = useState(false)
    const [time, setTime] = useState("")

    useEffect(() => {
        setMounted(true)
        setTime(new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
    }, [])

    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 tracking-tight relative z-10 w-full">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-zinc-100 tracking-tighter shadow-sm mb-3">
                    Good morning, {name}.
                </h1>
                <div className="flex items-center space-x-3 text-blue-500 font-mono text-[10px] md:text-xs uppercase tracking-widest">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span>SYSTEM ONLINE / SECURE CONNECTION</span>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                className="flex gap-4 items-center"
            >
                <div className="px-5 py-2.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex items-center space-x-2 text-xs font-medium text-zinc-300 shadow-inner">
                    <span className="text-blue-500"><Calendar className="w-4 h-4" /></span>
                    <span className="font-mono uppercase tracking-wider">{mounted ? time : '...'}</span>
                </div>

                {/* Profile Avatar Trigger */}
                <button className="h-10 w-10 rounded-full border border-zinc-800 bg-zinc-900 hover:border-blue-500/50 hover:bg-zinc-800 transition-colors flex items-center justify-center overflow-hidden group">
                    <span className="text-zinc-100 font-bold text-sm group-hover:scale-110 transition-transform">{name.charAt(0)}</span>
                </button>
            </motion.div>
        </header>
    )
}
