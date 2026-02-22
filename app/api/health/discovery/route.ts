import { NextResponse } from "next/server"

export async function GET() {
  try {
    return NextResponse.json({ status: "ok" })
  } catch (error) {
    return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
