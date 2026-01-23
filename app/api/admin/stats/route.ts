import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - startTime

    const apiEndpoints = [
      { name: "Chat API", path: "/api/health/chat" },
      { name: "Discovery API", path: "/api/health/discovery" },
      { name: "AI Health", path: "/api/ai/health" },
      { name: "Profile API", path: "/api/health/profile" }
    ]

    const apiStatuses = await Promise.all(
      apiEndpoints.map(async (endpoint) => {
        try {
          const res = await fetch(`http://localhost:3000${endpoint.path}`, {
            method: "GET",
            signal: AbortSignal.timeout(5000)
          })
          const data = await res.json()
          return {
            name: endpoint.name,
            status: data.status === "ok" ? "ok" : "error",
            lastChecked: new Date().toISOString()
          }
        } catch {
          return {
            name: endpoint.name,
            status: "error",
            lastChecked: new Date().toISOString()
          }
        }
      })
    )

    const recentErrors: { timestamp: string; message: string; route: string }[] = []

    return NextResponse.json({
      database: {
        status: "connected",
        latency: dbLatency
      },
      apis: apiStatuses,
      errors: recentErrors
    })
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to fetch stats",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
