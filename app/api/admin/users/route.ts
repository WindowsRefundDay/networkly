import { NextResponse } from "next/server"
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
    // Fetch users from Supabase users table
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, name, created_at, last_login_at, profile_views, connections")
      .order("created_at", { ascending: false })
      .limit(100)
    
    if (usersError) {
      throw usersError
    }
    
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
    
    if (countError) {
      throw countError
    }
    
    // Map snake_case to camelCase for API compatibility
    const mappedUsers = (users || []).map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
      profileViews: u.profile_views,
      connections: u.connections,
    }))
    
    return NextResponse.json({
      users: mappedUsers,
      total: totalCount || 0
    })
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to fetch users",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
