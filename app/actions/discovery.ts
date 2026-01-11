"use server";

import { spawn } from "child_process";
import path from "path";
import { readFileSync } from "fs";

interface DiscoveryResult {
    success: boolean;
    message: string;
    newOpportunities?: number;
}

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

export async function triggerDiscovery(
    query: string
): Promise<DiscoveryResult> {
    // Sanitize query to prevent command injection
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s]/g, "").slice(0, 100);

    if (!sanitizedQuery || sanitizedQuery.length < 3) {
        return {
            success: false,
            message: "Query too short. Please provide at least 3 characters.",
        };
    }

    return new Promise((resolve) => {
        const scraperPath = path.join(process.cwd(), "ec-scraper");
        const scriptPath = path.join(scraperPath, "scripts", "quick_discovery.py");

        // Load env from scraper's .env file
        const scraperEnv = loadEnvFromFile(path.join(scraperPath, ".env"));
        const mainEnv = loadEnvFromFile(path.join(process.cwd(), ".env"));

        // Run the discovery script
        const pythonProcess = spawn("python", [scriptPath, sanitizedQuery], {
            cwd: scraperPath,
            env: {
                ...process.env,
                ...mainEnv,
                ...scraperEnv,
                DATABASE_URL: process.env.DATABASE_URL || mainEnv.DATABASE_URL,
                GOOGLE_API_KEY: scraperEnv.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY,
            },
        });

        let stdout = "";
        let stderr = "";

        pythonProcess.stdout.on("data", (data) => {
            stdout += data.toString();
            console.log("[Discovery]", data.toString());
        });

        pythonProcess.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        // Timeout after 90 seconds (increased from 60)
        const timeout = setTimeout(() => {
            pythonProcess.kill();
            resolve({
                success: false,
                message: "Discovery timed out. Please try again.",
            });
        }, 90000);

        pythonProcess.on("close", (code) => {
            clearTimeout(timeout);

            if (code === 0) {
                // Parse the number of new opportunities from stdout
                const match = stdout.match(/Added (\d+) real opportunities/);
                const newCount = match ? parseInt(match[1], 10) : 0;

                resolve({
                    success: true,
                    message:
                        newCount > 0
                            ? `Found ${newCount} new opportunities!`
                            : "Search complete. No new opportunities found.",
                    newOpportunities: newCount,
                });
            } else {
                console.error("Discovery stderr:", stderr);
                console.error("Discovery stdout:", stdout);
                resolve({
                    success: false,
                    message: "Discovery failed. Please try again later.",
                });
            }
        });

        pythonProcess.on("error", (error) => {
            clearTimeout(timeout);
            console.error("Discovery process error:", error);
            resolve({
                success: false,
                message: "Failed to start discovery process.",
            });
        });
    });
}
