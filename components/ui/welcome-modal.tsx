"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Mail, ArrowRight } from "lucide-react"

const STORAGE_KEY = "networkly-welcome-seen"

export function WelcomeModal() {
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        // Check if user has already seen the welcome message
        const hasSeenWelcome = localStorage.getItem(STORAGE_KEY)
        if (!hasSeenWelcome) {
            setIsVisible(true)
        }
    }, [])

    const handleContinue = () => {
        setIsExiting(true)
        localStorage.setItem(STORAGE_KEY, "true")
        // Delay hide to allow exit animation to complete
        setTimeout(() => {
            setIsVisible(false)
        }, 600)
    }

    if (!isVisible) return null

    return (
        <AnimatePresence mode="wait">
            {!isExiting && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Backdrop with blur */}
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    />

                    {/* Modal content */}
                    <motion.div
                        className="relative z-10 mx-4 max-w-lg w-full"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.5, y: -50 }}
                        transition={{
                            duration: 0.5,
                            ease: [0.4, 0, 0.2, 1]
                        }}
                    >
                        {/* Glowing border effect */}
                        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary/50 via-secondary/50 to-primary/50 blur-sm opacity-75" />

                        <div className="relative bg-background/95 backdrop-blur-xl rounded-2xl border border-border/50 p-8 shadow-2xl">
                            {/* Header icon */}
                            <motion.div
                                className="flex justify-center mb-6"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            >
                                <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30">
                                    <Sparkles className="w-8 h-8 text-primary" />
                                </div>
                            </motion.div>

                            {/* Title */}
                            <motion.h2
                                className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                Welcome to Networkly! 🎉
                            </motion.h2>

                            {/* Content */}
                            <motion.div
                                className="space-y-4 text-muted-foreground"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <p className="text-center leading-relaxed">
                                    This app is a <span className="text-foreground font-medium">preview</span> of what's in the works and what's coming next.
                                </p>

                                <p className="text-center leading-relaxed">
                                    If you notice any bugs or have feedback on how we can do better, please reach out:
                                </p>

                                {/* Email highlight */}
                                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-primary/10 border border-primary/20">
                                    <Mail className="w-4 h-4 text-primary" />
                                    <a
                                        href="mailto:aarush.kadira@gmail.com"
                                        className="text-primary font-medium hover:underline"
                                    >
                                        aarush.kadira@gmail.com
                                    </a>
                                </div>

                                <p className="text-center leading-relaxed">
                                    Right now, Networkly is designed for <span className="text-foreground font-medium">high schoolers</span>—in the future, we'll expand to more demographics. Expect more polish and features as we grow.
                                </p>

                                <p className="text-center text-foreground font-medium">
                                    Thank you for being an early user—enjoy! ✨
                                </p>
                            </motion.div>

                            {/* Continue button */}
                            <motion.div
                                className="mt-8"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <button
                                    onClick={handleContinue}
                                    className="w-full group flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                >
                                    Continue to Networkly
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
