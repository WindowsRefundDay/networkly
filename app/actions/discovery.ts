"use server";

import { spawn } from "child_process";
import path from "path";
import fs from "fs";

interface DiscoveryResult {
    success: boolean;
    message: string;
    newOpportunities?: number;
}

interface BatchDiscoveryOptions {
    sources?: string[];
    focusAreas?: string[];
    limit?: number;
}

interface CacheStats {
    total_urls: number;
    by_status: Record<string, number>;
    pending_rechecks: number;
    top_domains: Array<{ domain: string; count: number }>;
}

function loadEnvFromFile(envPath: string): Record<string, string> {
    try {
        const content = fs.readFileSync(envPath, "utf-8");
        const env: Record<string, string> = {};

        content.split("\n").forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) return;
                const [key, ...valueParts] = trimmed.split("=");
                const value = valueParts.join("=").replace(/^["']|["']$/g, "");
            env[key] = value;
        });

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

        // Timeout after 2 minutes (aggressive optimization for quick discovery)
        // Quick discovery: query gen + search + filter + crawl + extract
        const QUICK_DISCOVERY_TIMEOUT_MS = 120_000;
        const timeout = setTimeout(() => {
            pythonProcess.kill();
            resolve({
                success: false,
                message: "Discovery timed out after 2 minutes. Please try again.",
            });
        }, QUICK_DISCOVERY_TIMEOUT_MS);

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

/**
 * Trigger batch discovery using multiple sources.
 */
export async function triggerBatchDiscovery(
    options: BatchDiscoveryOptions = {}
): Promise<DiscoveryResult> {
    const {
        sources = ["all"],
        focusAreas = ["STEM competitions", "internships", "summer programs", "scholarships"],
        limit = 50,
    } = options;

    return new Promise((resolve) => {
        const scraperPath = path.join(process.cwd(), "ec-scraper");
        const scriptPath = path.join(scraperPath, "scripts", "batch_discovery.py");

        const scraperEnv = loadEnvFromFile(path.join(scraperPath, ".env"));
        const mainEnv = loadEnvFromFile(path.join(process.cwd(), ".env"));

        // Build command arguments
        const args = [scriptPath];
        
        if (sources.length === 1 && sources[0] !== "all") {
            args.push("--source", sources[0]);
        }
        
        if (focusAreas.length > 0) {
            args.push("--focus", ...focusAreas);
        }
        
        args.push("--limit", limit.toString());

        const pythonProcess = spawn("python", args, {
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
            console.log("[BatchDiscovery]", data.toString());
        });

        pythonProcess.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        // Timeout after 10 minutes (aligned with daily profile settings)
        // Daily batch discovery: broader search, more URLs, longer crawl
        const BATCH_DISCOVERY_TIMEOUT_MS = 600_000; // 10 minutes
        const timeout = setTimeout(() => {
            pythonProcess.kill();
            resolve({
                success: false,
                message: "Batch discovery timed out after 10 minutes.",
            });
        }, BATCH_DISCOVERY_TIMEOUT_MS);

        pythonProcess.on("close", (code) => {
            clearTimeout(timeout);

            if (code === 0) {
                // Parse successful count from output
                const successMatch = stdout.match(/✅ Successful:\s+(\d+)/);
                const successCount = successMatch ? parseInt(successMatch[1], 10) : 0;

                resolve({
                    success: true,
                    message: `Batch discovery complete! Found ${successCount} new opportunities.`,
                    newOpportunities: successCount,
                });
            } else {
                console.error("Batch discovery stderr:", stderr);
                resolve({
                    success: false,
                    message: "Batch discovery encountered errors.",
                });
            }
        });

        pythonProcess.on("error", (error) => {
            clearTimeout(timeout);
            console.error("Batch discovery process error:", error);
            resolve({
                success: false,
                message: "Failed to start batch discovery.",
            });
        });
    });
}

/**
 * Get URL cache statistics.
 */
export async function getCacheStats(): Promise<CacheStats | null> {
    return new Promise((resolve) => {
        const scraperPath = path.join(process.cwd(), "ec-scraper");

        const pythonScript = `
import sys
sys.path.insert(0, '${scraperPath}')
from src.db.url_cache import get_url_cache
import json

cache = get_url_cache()
stats = cache.get_stats()
print(json.dumps(stats))
`;

        const pythonProcess = spawn("python", ["-c", pythonScript], {
            cwd: scraperPath,
        });

        let stdout = "";

        pythonProcess.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        pythonProcess.on("close", (code) => {
            if (code === 0) {
                try {
                    const stats = JSON.parse(stdout.trim());
                    resolve(stats);
                } catch (e) {
                    console.error("Failed to parse cache stats:", e);
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });

        pythonProcess.on("error", () => {
            resolve(null);
        });
    });
}

/**
 * Clear old cache entries.
 */
export async function clearOldCacheEntries(days: number = 90): Promise<{ success: boolean; deleted: number }> {
    return new Promise((resolve) => {
        const scraperPath = path.join(process.cwd(), "ec-scraper");

        const pythonScript = `
import sys
sys.path.insert(0, '${scraperPath}')
from src.db.url_cache import get_url_cache
import json

cache = get_url_cache()
deleted = cache.clear_old_entries(${days})
print(json.dumps({"deleted": deleted}))
`;

        const pythonProcess = spawn("python", ["-c", pythonScript], {
            cwd: scraperPath,
        });

        let stdout = "";

        pythonProcess.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        pythonProcess.on("close", (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(stdout.trim());
                    resolve({ success: true, deleted: result.deleted });
                } catch (e) {
                    resolve({ success: false, deleted: 0 });
                }
            } else {
                resolve({ success: false, deleted: 0 });
            }
        });

        pythonProcess.on("error", () => {
            resolve({ success: false, deleted: 0 });
        });
    });
}
