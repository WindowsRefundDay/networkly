import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    // Test Supabase connection with a simple query
    await supabase.from("users").select("id").limit(1)
    return NextResponse.json({ status: "ok" })
  } catch (error) {
    return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
