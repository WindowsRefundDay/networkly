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
                    transition={{ duration: 0.2 }}
                >
                    {/* Simple Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleDismiss}
                    />

                    {/* Modal content */}
                    <motion.div
                        className="relative z-10 mx-4 max-w-lg w-full overflow-hidden"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        <div className="relative bg-[#0a0a0a] rounded-2xl border border-white/5 p-8 shadow-2xl flex flex-col items-center text-center">
                            {/* Icon */}
                            <div className="mb-6 p-4 rounded-full bg-white/5 border border-white/10">
                                <Bug className="w-8 h-8 text-amber-500" />
                            </div>

                            {/* Title */}
                            <h2 className="text-2xl font-bold mb-4 text-white">
                                Known Bugs & Updates 🐛
                            </h2>

                            {/* Content */}
                            <div className="prose prose-invert prose-sm max-w-none mb-8 text-gray-400">
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
                                        ul: ({ children }) => <ul className="list-none p-0 m-0 space-y-2">{children}</ul>,
                                        li: ({ children }) => <li className="m-0 p-0 text-gray-400">{children}</li>,
                                        strong: ({ children }) => <span className="font-semibold text-white">{children}</span>,
                                        h1: () => null, // Hide h1 from markdown
                                        h2: () => null, // Hide h2 from markdown
                                        h3: () => null, // Hide h3 from markdown
                                        hr: () => <div className="my-6 border-t border-white/10" />
                                    }}
                                >
                                    {content}
                                </ReactMarkdown>
                            </div>

                            {/* Dismiss button */}
                            <button
                                onClick={handleDismiss}
                                className="w-full py-4 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-all duration-200 shadow-[0_0_20px_rgba(217,119,6,0.2)] active:scale-[0.98]"
                            >
                                Continue to Networkly
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
