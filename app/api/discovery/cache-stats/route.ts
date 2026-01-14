/**
 * API route for retrieving URL cache statistics.
 */

import { NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"

export async function GET(): Promise<NextResponse> {
    try {
        const scraperPath = path.join(process.cwd(), "ec-scraper")

        // Run Python script to get cache stats
        const pythonScript = `
import sys
sys.path.insert(0, '${scraperPath}')
from src.db.url_cache import get_url_cache
import json

cache = get_url_cache()
stats = cache.get_stats()
print(json.dumps(stats))
`

        return new Promise<NextResponse>((resolve) => {
            const pythonProcess = spawn("python", ["-c", pythonScript], {
                cwd: scraperPath,
            })

            let stdout = ""
            let stderr = ""

            pythonProcess.stdout.on("data", (data) => {
                stdout += data.toString()
            })

            pythonProcess.stderr.on("data", (data) => {
                stderr += data.toString()
            })

            pythonProcess.on("close", (code) => {
                if (code === 0) {
                    try {
                        const stats = JSON.parse(stdout.trim())
                        resolve(NextResponse.json(stats))
                    } catch (e) {
                        console.error("Failed to parse cache stats:", e)
                        resolve(
                            NextResponse.json(
                                { error: "Failed to parse cache statistics" },
                                { status: 500 }
                            )
                        )
                    }
                } else {
                    console.error("Cache stats error:", stderr)
                    resolve(
                        NextResponse.json(
                            { error: "Failed to retrieve cache statistics" },
                            { status: 500 }
                        )
                    )
                }
            })

            pythonProcess.on("error", (error) => {
                console.error("Cache stats process error:", error)
                resolve(
                    NextResponse.json(
                        { error: "Failed to start cache stats process" },
                        { status: 500 }
                    )
                )
            })
        })
    } catch (error) {
        console.error("[Cache Stats API Error]", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
