import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { getQueryStats, getQueryLogs } from "@/lib/ai/query-logger"

export async function GET(req: Request) {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'stats'
    const limit = parseInt(searchParams.get('limit') || '100')
    
    if (type === 'logs') {
      const logs = await getQueryLogs(limit)
      return NextResponse.json({ logs })
    }
    
    const stats = await getQueryStats()
    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to fetch AI query diagnostics",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
