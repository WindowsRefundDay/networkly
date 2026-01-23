import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { stdout: branch } = await execAsync("git rev-parse --abbrev-ref HEAD")
    const { stdout, stderr } = await execAsync(`git pull origin ${branch.trim()}`)
    
    return NextResponse.json({
      success: true,
      output: stdout || stderr
    })
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to pull latest",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
