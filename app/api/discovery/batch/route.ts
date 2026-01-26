/**
 * API route for batch discovery using multiple sources.
 * Supports curated sources, sitemaps, RSS feeds, search, and recheck queue.
 */

import { NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"
import fs from "fs"

function loadEnvFromFile(envPath: string): Record<string, string> {
    try {
        const content = fs.readFileSync(envPath, "utf-8")
        const env: Record<string, string> = {}

        content.split("\n").forEach((line) => {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith("#")) return
            const [key, ...valueParts] = trimmed.split("=")
            const value = valueParts.join("=").replace(/^["']|["']$/g, "")
            env[key] = value
        })

        return env
    } catch {
        return {}
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            sources = ["all"],
            focusAreas = ["STEM competitions", "internships", "summer programs", "scholarships"],
            limit = 50,
        } = body

        // Validate sources
        const validSources = ["curated", "sitemaps", "rss", "search", "recheck", "all"]
        const selectedSources = sources.filter((s: string) => validSources.includes(s))

        if (selectedSources.length === 0) {
            return NextResponse.json(
                { error: "No valid sources selected" },
                { status: 400 }
            )
        }

        // Create a TransformStream for SSE
        const stream = new TransformStream()
        const writer = stream.writable.getWriter()
        const encoder = new TextEncoder()

        let writerClosed = false

        const safeWrite = async (data: string) => {
            if (writerClosed) return
            try {
                await writer.write(encoder.encode(data))
            } catch (error) {
                if (!writerClosed) {
                    writerClosed = true
                }
            }
        }

        const safeClose = async () => {
            if (writerClosed) return
            writerClosed = true
            try {
                await writer.close()
            } catch {
                // Already closed
            }
        }

        // Paths
        const scraperPath = path.join(process.cwd(), "ec-scraper")
        const scriptPath = path.join(scraperPath, "scripts", "batch_discovery.py")

        // Environment
        const scraperEnv = loadEnvFromFile(path.join(scraperPath, ".env"))
        const mainEnv = loadEnvFromFile(path.join(process.cwd(), ".env"))

        // Build command arguments
        const args = ["python", scriptPath]
        
        // Add source selection
        if (selectedSources.length === 1 && selectedSources[0] !== "all") {
            args.push("--source", selectedSources[0])
        }
        
        // Add focus areas
        if (focusAreas.length > 0) {
            args.push("--focus", ...focusAreas)
        }
        
        // Add limit
        args.push("--limit", limit.toString())

        // Spawn the process asynchronously
        ;(async () => {
            const pythonProcess = spawn(args[0], args.slice(1), {
                cwd: scraperPath,
                env: {
                    ...process.env,
                    ...mainEnv,
                    ...scraperEnv,
                    DATABASE_URL: process.env.DATABASE_URL || mainEnv.DATABASE_URL,
                    GOOGLE_API_KEY: scraperEnv.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY,
                },
            })

            pythonProcess.stdout.on("data", async (data) => {
                const text = data.toString()
                console.log("[BatchDiscovery]", text)

                // Parse progress and send as SSE
                const lines = text.split("\n")
                for (const line of lines) {
                    if (!line.trim()) continue

                    // Extract status from log messages
                    let eventData: any = { type: "log", message: line }

                    if (line.includes("📚 Discovering from curated")) {
                        eventData = { type: "status", phase: "curated", message: "Checking curated sources..." }
                    } else if (line.includes("🗺️  Discovering from sitemaps")) {
                        eventData = { type: "status", phase: "sitemaps", message: "Crawling sitemaps..." }
                    } else if (line.includes("📡 Discovering from RSS")) {
                        eventData = { type: "status", phase: "rss", message: "Monitoring RSS feeds..." }
                    } else if (line.includes("🔍 Discovering from AI search")) {
                        eventData = { type: "status", phase: "search", message: "AI-powered search..." }
                    } else if (line.includes("🔄 Getting recheck queue")) {
                        eventData = { type: "status", phase: "recheck", message: "Processing recheck queue..." }
                    } else if (line.includes("⚙️  Processing")) {
                        const match = line.match(/Processing (\d+) URLs/)
                        if (match) {
                            eventData = { type: "processing", count: parseInt(match[1]) }
                        }
                    } else if (line.includes("✅") && line.includes("successful")) {
                        const match = line.match(/✅ (\d+) successful/)
                        if (match) {
                            eventData = { type: "success", count: parseInt(match[1]) }
                        }
                    } else if (line.includes("📈 FINAL STATISTICS")) {
                        eventData = { type: "status", phase: "complete", message: "Discovery complete!" }
                    }

                    await safeWrite(`data: ${JSON.stringify(eventData)}\n\n`)
                }
            })

            pythonProcess.stderr.on("data", async (data) => {
                const text = data.toString()
                console.error("[BatchDiscovery Error]", text)
                await safeWrite(`data: ${JSON.stringify({ type: "error", message: text })}\n\n`)
            })

            pythonProcess.on("close", async (code) => {
                const finalMessage = code === 0
                    ? "Batch discovery completed successfully!"
                    : "Batch discovery encountered errors."

                await safeWrite(
                    `data: ${JSON.stringify({ type: "complete", success: code === 0, message: finalMessage })}\n\n`
                )
                await safeClose()
            })

            pythonProcess.on("error", async (error) => {
                console.error("[BatchDiscovery Process Error]", error)
                await safeWrite(
                    `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`
                )
                await safeClose()
            })
        })()

        return new Response(stream.readable, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        })
    } catch (error) {
        console.error("[Batch Discovery API Error]", error)
        return NextResponse.json(
            { error: "Failed to start batch discovery" },
            { status: 500 }
        )
    }
}
