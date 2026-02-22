import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/auth/callback",
    "/api/chat",
    "/api/discovery",
    "/api/profile",
    "/api/ai",
    "/api/health",
]

export default async function middleware(request: NextRequest) {
    const { supabaseResponse, user } = await updateSession(request)

    supabaseResponse.headers.set("X-Frame-Options", "DENY")
    supabaseResponse.headers.set("X-Content-Type-Options", "nosniff")
    supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    supabaseResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

    const url = request.nextUrl

    if (url.pathname.startsWith("/profile/") && url.pathname !== "/profile") {
        const profileId = url.pathname.split("/")[2]
        if (profileId && profileId.length === 36) {
            const ipAddress =
                request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
            const rateLimitKey = `profile_view:${ipAddress}:${profileId}`
            supabaseResponse.headers.set("X-Rate-Limit-Key", rateLimitKey)
        }
    }

    const path = url.pathname
    const isPublic = publicRoutes.some((route) => path === route || path.startsWith(`${route}/`))

    if (!isPublic && !user) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = "/login"
        redirectUrl.searchParams.set("redirect", path)
        return NextResponse.redirect(redirectUrl)
    }

    if (user && (path === "/login" || path === "/signup")) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = "/dashboard"
        return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
}
