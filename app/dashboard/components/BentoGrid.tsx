'use client'

import { motion } from "framer-motion"

export function BentoGrid({ children }: { children: React.ReactNode }) {
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 hover:[&>div]:transition-all w-full relative z-10"
        >
            {children}
        </motion.div>
    )
}

export function BentoItem({
    children,
    colSpan,
    className = ""
}: {
    children: React.ReactNode
    colSpan: string
    className?: string
}) {
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 20
            }
        }
    }

    return (
        <motion.div
            variants={itemVariants}
            className={`p-8 rounded-[2.5rem] border border-zinc-800 bg-[#09090b] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] flex flex-col justify-center relative ${colSpan} ${className}`}
        >
            {/* Liquid glass inner refraction edge */}
            <div className="absolute inset-0 rounded-[2.5rem] pointer-events-none border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    )
}
