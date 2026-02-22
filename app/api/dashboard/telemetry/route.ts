import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/supabase/server"
import { DashboardTelemetryResponseSchema } from "@/lib/dashboard/telemetry-schema"
import { DashboardTelemetryError, getDashboardTelemetry } from "@/lib/dashboard/telemetry-service"

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  )
}

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return errorResponse(401, "UNAUTHORIZED", "Authentication required")
    }

    const telemetry = await getDashboardTelemetry(user.id)
    const validated = DashboardTelemetryResponseSchema.parse(telemetry)

    return NextResponse.json(validated)
  } catch (error) {
    if (error instanceof DashboardTelemetryError) {
      if (error.code === "NOT_FOUND") {
        return errorResponse(404, "DASHBOARD_TELEMETRY_NOT_FOUND", "Dashboard telemetry not found")
      }

      if (error.code === "INVALID_PAYLOAD") {
        return errorResponse(500, "DASHBOARD_TELEMETRY_INVALID_PAYLOAD", "Invalid dashboard telemetry payload")
      }

      return errorResponse(500, "DASHBOARD_TELEMETRY_RPC_ERROR", "Dashboard telemetry RPC failed")
    }

    console.error("[api/dashboard/telemetry] unexpected error", error)
    return errorResponse(500, "INTERNAL_SERVER_ERROR", "Unexpected server error")
  }
}
