import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { stdout, stderr } = await execAsync("pnpm test:run", {
      timeout: 60000
    })
    
    const output = stdout + stderr
    const passedMatch = output.match(/(\d+) passed/)
    const failedMatch = output.match(/(\d+) failed/)
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0
    
    return NextResponse.json({
      status: failed === 0 ? "pass" : "fail",
      passed,
      failed,
      output
    })
  } catch (error) {
    const errorOutput = error instanceof Error && 'stdout' in error 
      ? String(error.stdout) + String((error as { stderr?: string }).stderr || '')
      : error instanceof Error ? error.message : String(error)
    
    return NextResponse.json({
      status: "fail",
      passed: 0,
      failed: 0,
      output: errorOutput
    })
  }
}
