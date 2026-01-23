"use server"

import { createClient, requireAuth } from "@/lib/supabase/server"

export async function getAnalyticsSummary() {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("profile_views, search_appearances, connections, completed_projects")
    .eq("id", authUser.id)
    .single()

  if (userError || !user) return null

  const { count: applicationsCount } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", authUser.id)

  const { data: analyticsData } = await supabase
    .from("analytics_data")
    .select("profile_views, network_growth")
    .eq("user_id", authUser.id)
    .single()

  const profileViewsData = analyticsData?.profile_views
    ? (analyticsData.profile_views as { value: number }[])
    : generateDefaultSparklineData()

  const networkGrowthData = analyticsData?.network_growth
    ? (analyticsData.network_growth as { value: number }[])
    : generateDefaultSparklineData()

  const searchAppearancesData = generateDefaultSparklineData()

  return {
    profileViews: {
      value: user.profile_views,
      change: "+0%",
      trend: "up",
    },
    searchAppearances: {
      value: user.search_appearances,
      change: "+0%",
      trend: "up",
    },
    connections: {
      value: user.connections,
      change: "+0%",
      trend: "up",
    },
    applications: {
      value: applicationsCount || 0,
      change: "+0",
      trend: "up",
    },
    projects: {
      value: user.completed_projects,
      change: "+0",
      trend: "up",
    },
    sparklineData: {
      profileViews: profileViewsData,
      networkGrowth: networkGrowthData,
      searchAppearances: searchAppearancesData,
    },
  }
}

function generateDefaultSparklineData(): { value: number }[] {
  return Array.from({ length: 7 }, () => ({ value: 0 }))
}

export async function getProfileViewsData() {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: analytics, error } = await supabase
    .from("analytics_data")
    .select("profile_views")
    .eq("user_id", authUser.id)
    .single()

  if (error || !analytics || !analytics.profile_views) return []

  return analytics.profile_views as { date: string; views: number }[]
}

export async function getNetworkGrowthData() {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: analytics, error } = await supabase
    .from("analytics_data")
    .select("network_growth")
    .eq("user_id", authUser.id)
    .single()

  if (error || !analytics || !analytics.network_growth) return []

  return analytics.network_growth as { month: string; connections: number }[]
}
