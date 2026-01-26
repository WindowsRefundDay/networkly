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
                    {/* Backdrop with blur */}
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleDismiss}
                    />

                    {/* Modal content */}
                    <motion.div
                        className="relative z-10 mx-4 max-w-2xl w-full max-h-[80vh] overflow-hidden"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{
                            duration: 0.25,
                            ease: "easeOut"
                        }}
                    >
                        {/* Glowing border effect */}
                        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-red-500/30 blur-sm opacity-50" />

                        <div className="relative bg-background/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-border/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                                        <Bug className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Known Bugs</h2>
                                        <p className="text-xs text-muted-foreground">Updated information about current issues</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                    aria-label="Dismiss"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[60vh] prose prose-sm dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-a:text-primary">
                                <ReactMarkdown>{content}</ReactMarkdown>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-border/50 bg-muted/30">
                                <button
                                    onClick={handleDismiss}
                                    className="w-full group flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                >
                                    Got it, thanks!
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
