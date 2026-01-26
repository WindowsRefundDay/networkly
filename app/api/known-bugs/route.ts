import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), "KNOWN_BUGS.md")

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return NextResponse.json(
                { error: "Known bugs file not found" },
                { status: 404 }
            )
        }

        // Get file stats for last modified time
        const stats = fs.statSync(filePath)
        const lastModified = stats.mtime.toISOString()

        // Read file content
        const content = fs.readFileSync(filePath, "utf-8")

        return NextResponse.json({
            content,
            lastModified
        })
    } catch (error) {
        console.error("Error reading known bugs file:", error)
        return NextResponse.json(
            { error: "Failed to read known bugs file" },
            { status: 500 }
        )
    }
}
