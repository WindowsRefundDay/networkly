"use server"

import { getCurrentUser } from "@/lib/supabase/server"
import { getDashboardTelemetry } from "@/lib/dashboard/telemetry-service"
import type { DashboardTelemetryResponse } from "@/lib/dashboard/telemetry-schema"

export async function getDashboardData(): Promise<DashboardTelemetryResponse | null> {
  const authUser = await getCurrentUser()

  if (!authUser) {
    return null
  }

  return getDashboardTelemetry(authUser.id)
}
