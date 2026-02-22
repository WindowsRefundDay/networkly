import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { createClient } from "@/lib/supabase/server"

const CONFIG_FILE = path.join(process.cwd(), "data", "admin-config.json")

async function ensureConfigFile() {
  try {
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true })
    try {
      await fs.access(CONFIG_FILE)
    } catch {
      await fs.writeFile(CONFIG_FILE, JSON.stringify({
        MAX_AI_REQUESTS_PER_MIN: "100",
        ENABLE_DISCOVERY_CACHE: "true",
        DB_CONNECTION_POOL_SIZE: "10",
        API_TIMEOUT_MS: "30000"
      }, null, 2))
    }
  } catch (error) {
    console.error("Failed to ensure config file:", error)
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureConfigFile()
    const data = await fs.readFile(CONFIG_FILE, "utf-8")
    return NextResponse.json(JSON.parse(data))
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to read config",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { key, value } = await req.json()
    
    await ensureConfigFile()
    const data = await fs.readFile(CONFIG_FILE, "utf-8")
    const config = JSON.parse(data)
    
    config[key] = value
    
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to update config",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
