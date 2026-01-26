"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bug, X, ExternalLink } from "lucide-react"
import ReactMarkdown from "react-markdown"

const STORAGE_KEY = "networkly-known-bugs-dismissed"
const VERSION_KEY = "networkly-known-bugs-version"
const LAST_SHOWN_KEY = "networkly-known-bugs-last-shown"

// Cooldown period: 12 hours (in milliseconds)
const SHOW_COOLDOWN = 12 * 60 * 60 * 1000;

// Set this to false to hide the modal from all users
const SHOW_KNOWN_BUGS_MODAL = true

export function KnownBugsModal() {
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)
    const [content, setContent] = useState<string>("")
    const [currentVersion, setCurrentVersion] = useState<string>("")

    useEffect(() => {
        // Don't show if globally disabled
        if (!SHOW_KNOWN_BUGS_MODAL) return

        const fetchKnownBugs = async () => {
            try {
                // Fetch the markdown file with cache-busting
                const response = await fetch(`/known_bugs.md?t=${Date.now()}`)
                if (!response.ok) return

                const text = await response.text()

                // Use content hash as version to detect changes
                const version = await generateHash(text)
                setContent(text)
                setCurrentVersion(version)

                // Check if user has dismissed this version
                const dismissedVersion = localStorage.getItem(VERSION_KEY)
                const isDismissed = localStorage.getItem(STORAGE_KEY) === "true"

                // Show modal if:
                // 1. Never dismissed before, OR
                // 2. Content has been updated (different version)
                if (!isDismissed || dismissedVersion !== version) {
                    const lastShown = localStorage.getItem(LAST_SHOWN_KEY)
                    const now = Date.now()

                    // Only show if content changed OR it's been longer than the cooldown
                    if (dismissedVersion !== version || !lastShown || (now - parseInt(lastShown)) > SHOW_COOLDOWN) {
                        // Add a delay to make it less aggressive
                        setTimeout(() => {
                            setIsVisible(true)
                            localStorage.setItem(LAST_SHOWN_KEY, Date.now().toString())
                        }, 3000)

                        // Clear the dismissed flag if content changed
                        if (dismissedVersion !== version) {
                            localStorage.removeItem(STORAGE_KEY)
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch known bugs:", error)
            }
        }

        fetchKnownBugs()
    }, [])

    const generateHash = async (text: string): Promise<string> => {
        const encoder = new TextEncoder()
        const data = encoder.encode(text)
        const hashBuffer = await crypto.subtle.digest("SHA-256", data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16)
    }

    const handleDismiss = () => {
        setIsExiting(true)
        localStorage.setItem(STORAGE_KEY, "true")
        localStorage.setItem(VERSION_KEY, currentVersion)
        setTimeout(() => {
            setIsVisible(false)
        }, 400)
    }

    if (!isVisible || !content) return null

    return (
        <AnimatePresence mode="wait">
            {!isExiting && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div
                        className="absolute inset-0 bg-black/70 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleDismiss}
                    />

                    <motion.div
                        className="relative z-10 w-full max-w-md"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 shadow-2xl flex flex-col items-center text-center">
                            <div className="mb-6 w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <Bug className="w-8 h-8 text-blue-500" />
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-4">
                                Updates & Bug Fixes
                            </h2>

                            <div className="text-gray-400 text-sm mb-8 max-h-[40vh] overflow-y-auto w-full px-2 custom-scrollbar">
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
                                        ul: ({ children }) => <ul className="text-left space-y-2 mb-4">{children}</ul>,
                                        li: ({ children }) => <li className="flex gap-2"><span>•</span>{children}</li>,
                                        h1: () => null,
                                        h2: () => null,
                                        h3: () => null,
                                        hr: () => <hr className="border-white/5 my-4" />
                                    }}
                                >
                                    {content}
                                </ReactMarkdown>
                            </div>

                            <button
                                onClick={handleDismiss}
                                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                            >
                                Continue
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
