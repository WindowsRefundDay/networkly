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
            GROQ_API_KEY: scraperEnv.GROQ_API_KEY || process.env.GROQ_API_KEY || mainEnv.GROQ_API_KEY,
            GOOGLE_API_KEY: scraperEnv.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || mainEnv.GOOGLE_API_KEY,
            API_MODE: scraperEnv.API_MODE || process.env.API_MODE || "gemini", // Default to Google Gemini
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

    // Set up 2-minute timeout to kill the process if it takes too long
    const PROCESS_TIMEOUT_MS = 120_000; // 2 minutes
    const timeoutId = setTimeout(() => {
        if (!processEnded) {
            console.log("[Discovery] Process timeout reached, killing Python process");
            cleanup();
        }
    }, PROCESS_TIMEOUT_MS);

    // Handle process output
    pythonProcess.stdout.on("data", async (data) => {
        if (writerClosed) return;
        const lines = data.toString().split("\n");
        for (const line of lines) {
            if (line.trim() && !writerClosed) {
                // Format as SSE event
                const event = `data: ${line.trim()}\n\n`;
                await safeWrite(event);
            }
        }
    });

    pythonProcess.stderr.on("data", (data) => {
        console.error(`[Discovery Error] ${data}`);
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
