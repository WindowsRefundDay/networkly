import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        lastLoginAt: true,
        profileViews: true,
        connections: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    })
    
    const totalCount = await prisma.user.count()
    
    return NextResponse.json({
      users,
      total: totalCount
    })
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to fetch users",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
