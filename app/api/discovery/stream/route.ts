import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { readFileSync } from "fs";

// Helper to load env vars from .env file
function loadEnvFromFile(envPath: string): Record<string, string> {
    try {
        const content = readFileSync(envPath, "utf-8");
        const env: Record<string, string> = {};
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
                const [key, ...valueParts] = trimmed.split("=");
                const value = valueParts.join("=").replace(/^["']|["']$/g, "");
                env[key.trim()] = value.trim();
            }
        }
        return env;
    } catch {
        return {};
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const userProfileId = searchParams.get("userProfileId"); // Optional: for personalized discovery

    if (!query) {
        return NextResponse.json({ error: "Query parameter required" }, { status: 400 });
    }

    // Create a TransformStream for SSE
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Track stream state to prevent writing after close
    let writerClosed = false;

    // Safe write helper - prevents writing to closed stream
    const safeWrite = async (data: string) => {
        if (writerClosed) return;
        try {
            await writer.write(encoder.encode(data));
        } catch (error) {
            // Stream was closed (client disconnected) - silently handle
            if (!writerClosed) {
                writerClosed = true;
            }
        }
    };

    // Safe close helper
    const safeClose = async () => {
        if (writerClosed) return;
        writerClosed = true;
        try {
            await writer.close();
        } catch {
            // Already closed - ignore
        }
    };

    // Paths
    const scraperPath = path.join(process.cwd(), "ec-scraper");
    const scriptPath = path.join(scraperPath, "scripts", "quick_discovery.py");

    // Environment
    const scraperEnv = loadEnvFromFile(path.join(scraperPath, ".env"));
    const mainEnv = loadEnvFromFile(path.join(process.cwd(), ".env"));

    // Build Python command arguments
    const pythonArgs = ["-u", scriptPath, query];
    
    // Add user profile ID if provided for personalized discovery
    if (userProfileId) {
        pythonArgs.push("--user-profile-id", userProfileId);
    }

    // Spawn Python process
    // -u forces unbuffered output so we get events immediately
    const pythonProcess = spawn("python", pythonArgs, {
        cwd: scraperPath,
        env: {
            ...process.env,
            ...mainEnv,
            ...scraperEnv,
            DATABASE_URL: process.env.DATABASE_URL || mainEnv.DATABASE_URL,
            GOOGLE_API_KEY: scraperEnv.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || mainEnv.GOOGLE_API_KEY,
        },
    });

    // Track if process is still running
    let processEnded = false;

    // Cleanup function to kill Python process and close stream
    const cleanup = () => {
        if (!processEnded) {
            processEnded = true;
            pythonProcess.kill("SIGTERM");
            // Force kill after 2 seconds if still running
            setTimeout(() => {
                try {
                    pythonProcess.kill("SIGKILL");
                } catch {
                    // Process already dead - ignore
                }
            }, 2000);
        }
        safeClose();
    };

    // Handle client disconnect via abort signal
    req.signal.addEventListener("abort", () => {
        cleanup();
    });

    // Set up timeout to kill the process if it takes too long
    // Quick discovery profile: aggressively optimized for speed
    // This covers: query gen (~3s) + search (~15s) + semantic filter (~8s) + crawl (~50s) + extract (~40s)
    const QUICK_DISCOVERY_TIMEOUT_MS = 120_000; // 2 minutes - aggressive timeout
    const timeoutId = setTimeout(async () => {
        if (!processEnded) {
            console.log("[Discovery] Process timeout reached, killing Python process");
            // Notify client of timeout before cleanup
            const timeoutEvent = `data: ${JSON.stringify({ 
                type: "error", 
                message: "Discovery timed out after 2 minutes",
                source: "timeout" 
            })}\n\n`;
            await safeWrite(timeoutEvent);
            cleanup();
        }
    }, QUICK_DISCOVERY_TIMEOUT_MS);

    // Handle process output - only emit valid JSON events
    pythonProcess.stdout.on("data", async (data) => {
        if (writerClosed) return;
        const lines = data.toString().split("\n");
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || writerClosed) continue;
            
            // Only forward valid JSON to prevent client-side parse errors
            if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                try {
                    // Validate JSON before sending
                    JSON.parse(trimmed);
                    const event = `data: ${trimmed}\n\n`;
                    await safeWrite(event);
                } catch {
                    // Invalid JSON - log it but don't send
                    console.warn("[Discovery] Skipping invalid JSON:", trimmed.slice(0, 100));
                }
            } else {
                // Non-JSON output (debug logs) - log server-side only
                console.log("[Discovery]", trimmed);
            }
        }
    });

    // Forward stderr messages as error events to the client
    pythonProcess.stderr.on("data", async (data) => {
        const message = data.toString().trim();
        console.error(`[Discovery Error] ${message}`);
        
        // Forward significant errors to the client
        if (message && !writerClosed) {
            // Filter out noisy debug messages that start with common prefixes
            const isImportantError = !message.startsWith("[DEBUG]") && 
                                      !message.startsWith("[INFO]") &&
                                      !message.includes("DeprecationWarning") &&
                                      !message.includes("FutureWarning");
            
            if (isImportantError) {
                const errorEvent = `data: ${JSON.stringify({ 
                    type: "error", 
                    message: message.slice(0, 200),
                    source: "stderr" 
                })}\n\n`;
                await safeWrite(errorEvent);
            }
        }
    });

    pythonProcess.on("close", async (code) => {
        processEnded = true;
        clearTimeout(timeoutId);
        // End the stream
        const endEvent = `data: {"type": "done", "code": ${code}}\n\n`;
        await safeWrite(endEvent);
        await safeClose();
    });

    pythonProcess.on("error", (error) => {
        console.error(`[Discovery] Process error: ${error.message}`);
        cleanup();
    });

    return new NextResponse(stream.readable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
