import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function validateUrl(url: string): Promise<{
  alive: boolean
  status: number
  finalUrl?: string
  error?: string
}> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Networkly/1.0; +https://networkly.app)",
      },
    })

    clearTimeout(timeout)

    if (response.ok) {
      return { alive: true, status: response.status, finalUrl: response.url }
    }

    // Some servers reject HEAD — try GET with Range header (downloads ~0 bytes)
    if (response.status === 405 || response.status === 403) {
      const controller2 = new AbortController()
      const timeout2 = setTimeout(() => controller2.abort(), 5000)

      const getResponse = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller2.signal,
        headers: {
          Range: "bytes=0-0",
          "User-Agent":
            "Mozilla/5.0 (compatible; Networkly/1.0; +https://networkly.app)",
        },
      })

      clearTimeout(timeout2)
      return {
        alive: getResponse.ok || getResponse.status === 206,
        status: getResponse.status,
        finalUrl: getResponse.url,
      }
    }

    return { alive: false, status: response.status }
  } catch (error: any) {
    if (error.name === "AbortError") {
      return { alive: false, status: 0, error: "timeout" }
    }
    return { alive: false, status: 0, error: error.message }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { opportunityId, url } = body

    if (!opportunityId || !url) {
      return NextResponse.json(
        { error: "Missing opportunityId or url" },
        { status: 400 }
      )
    }

    // Quick validation
    const result = await validateUrl(url)

    // Update DB in background (don't block the response)
    const supabase = createAdminClient()
    const now = new Date().toISOString()

    if (result.alive) {
      await supabase
        .from("opportunities")
        .update({ last_verified: now, updated_at: now })
        .eq("id", opportunityId)
    } else {
      await supabase
        .from("opportunities")
        .update({
          is_active: false,
          is_expired: true,
          last_verified: now,
          updated_at: now,
        })
        .eq("id", opportunityId)
    }

    return NextResponse.json({
      alive: result.alive,
      status: result.status,
      finalUrl: result.finalUrl,
      error: result.error,
    })
  } catch (error: any) {
    console.error("[Validate] Error:", error)
    return NextResponse.json(
      { error: "Validation failed", alive: true },
      { status: 500 }
    )
  }
}
