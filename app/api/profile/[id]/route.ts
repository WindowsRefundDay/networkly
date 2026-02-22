import { NextRequest, NextResponse } from "next/server"
import { getProfileByUserId } from "@/app/actions/profile"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getProfileByUserId(id)

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
