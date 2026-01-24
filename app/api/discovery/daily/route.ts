/**
 * API route for cron-triggered daily batch discovery.
 * 
 * This endpoint is designed to be called by:
 * - GitHub Actions scheduled workflow
 * - Server cron job
 * - Vercel/Railway cron jobs
 * 
 * Security: Protected by CRON_SECRET header.
 * 
 * Example cron job (every day at 2 AM UTC):
 *   curl -X POST https://yourapp.com/api/discovery/daily \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"
import fs from "fs"

// Daily discovery focus areas for comprehensive coverage
const DAILY_FOCUS_AREAS = [
    "STEM competitions high school 2026",
    "summer research programs high school",
    "internships for high school students",
    "scholarships high school seniors",
    "volunteer opportunities teenagers",
    "coding bootcamps high school",
    "leadership programs youth",
    "arts competitions high school",
    "science olympiad programs",
    "entrepreneurship competitions students",
]

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
    // Security: Verify cron secret
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
        console.warn("[DailyDiscovery] CRON_SECRET not configured")
        return NextResponse.json(
            { error: "CRON_SECRET not configured" },
            { status: 500 }
        )
    }
    
    const providedSecret = authHeader?.replace("Bearer ", "")
    if (providedSecret !== cronSecret) {
        console.warn("[DailyDiscovery] Invalid cron secret")
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        )
    }
    
    console.log("[DailyDiscovery] Starting daily batch discovery...")
    
    try {
        // Paths
        const scraperPath = path.join(process.cwd(), "ec-scraper")
        const scriptPath = path.join(scraperPath, "scripts", "batch_discovery.py")

        // Environment
        const scraperEnv = loadEnvFromFile(path.join(scraperPath, ".env"))
        const mainEnv = loadEnvFromFile(path.join(process.cwd(), ".env"))

        // Build command arguments for daily profile
        const args = [
            scriptPath,
            "--source", "all",
            "--focus", ...DAILY_FOCUS_AREAS.slice(0, 5), // Limit to 5 focus areas per run
            "--limit", "100", // Higher limit for daily runs
        ]

        // Run synchronously and collect results
        const result = await new Promise<{
            success: boolean
            stdout: string
            stderr: string
            exitCode: number | null
        }>((resolve) => {
            let stdout = ""
            let stderr = ""
            
            const pythonProcess = spawn("python", args, {
                cwd: scraperPath,
                env: {
                    ...process.env,
                    ...mainEnv,
                    ...scraperEnv,
                    DATABASE_URL: process.env.DATABASE_URL || mainEnv.DATABASE_URL,
                    GOOGLE_API_KEY: scraperEnv.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY,
                    GROQ_API_KEY: scraperEnv.GROQ_API_KEY || process.env.GROQ_API_KEY,
                    // Force daily profile
                    DISCOVERY_PROFILE: "daily",
                },
            })

            pythonProcess.stdout.on("data", (data) => {
                stdout += data.toString()
                console.log("[DailyDiscovery]", data.toString())
            })

            pythonProcess.stderr.on("data", (data) => {
                stderr += data.toString()
                console.error("[DailyDiscovery Error]", data.toString())
            })

            // Timeout after 10 minutes (aligned with BATCH_DISCOVERY_TIMEOUT_MS)
            const timeout = setTimeout(() => {
                pythonProcess.kill()
                resolve({
                    success: false,
                    stdout,
                    stderr: stderr + "\nProcess timed out after 10 minutes",
                    exitCode: null,
                })
            }, 600_000)

            pythonProcess.on("close", (code) => {
                clearTimeout(timeout)
                resolve({
                    success: code === 0,
                    stdout,
                    stderr,
                    exitCode: code,
                })
            })

            pythonProcess.on("error", (error) => {
                clearTimeout(timeout)
                resolve({
                    success: false,
                    stdout,
                    stderr: stderr + `\nProcess error: ${error.message}`,
                    exitCode: null,
                })
            })
        })

        // Parse statistics from stdout
        const stats = {
            successful: 0,
            failed: 0,
            total_processed: 0,
        }
        
        const successMatch = result.stdout.match(/✅ Successful:\s+(\d+)/)
        const failedMatch = result.stdout.match(/❌ Failed:\s+(\d+)/)
        const totalMatch = result.stdout.match(/Total URLs processed:\s+(\d+)/)
        
        if (successMatch) stats.successful = parseInt(successMatch[1])
        if (failedMatch) stats.failed = parseInt(failedMatch[1])
        if (totalMatch) stats.total_processed = parseInt(totalMatch[1])

        console.log("[DailyDiscovery] Complete:", {
            success: result.success,
            stats,
            exitCode: result.exitCode,
        })

        return NextResponse.json({
            success: result.success,
            message: result.success 
                ? `Daily discovery complete. Found ${stats.successful} new opportunities.`
                : "Daily discovery encountered errors.",
            stats,
            exitCode: result.exitCode,
            timestamp: new Date().toISOString(),
        })
        
    } catch (error) {
        console.error("[DailyDiscovery] Error:", error)
        return NextResponse.json(
            { 
                error: "Failed to run daily discovery",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        )
    }
}

// Also support GET for simple cron services that only do GET requests
export async function GET(req: NextRequest) {
    return POST(req)
}
