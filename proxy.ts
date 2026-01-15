import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    "/",
    "/login(.*)",
    "/signup(.*)",
    "/api/(.*)",
])

export default clerkMiddleware(
    async (auth, request) => {
        const response = NextResponse.next()

        // Add security headers (non-CSP)
        response.headers.set("X-Frame-Options", "DENY")
        response.headers.set("X-Content-Type-Options", "nosniff")
        response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

        const url = request.nextUrl

        // Rate limit tracking for profile views
        if (url.pathname.startsWith("/profile/") && url.pathname !== "/profile") {
            const profileId = url.pathname.split("/")[2]
            if (profileId && profileId.length === 36) {
                const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
                const rateLimitKey = `profile_view:${ipAddress}:${profileId}`
                response.headers.set("X-Rate-Limit-Key", rateLimitKey)
            }
        }

        // Protect all routes except public ones
        if (!isPublicRoute(request)) {
            await auth.protect()
        }

        return response
    },
    {
        // Use Clerk's automatic CSP configuration for proper inline styles support
        contentSecurityPolicy: {
            // Additional directives beyond Clerk's defaults
            "img-src": ["'self'", "data:", "https:", "blob:"],
            "font-src": ["'self'", "data:", "https://fonts.gstatic.com", "https://r2cdn.perplexity.ai"],
            "connect-src": ["'self'", "https:"],
        },
    }
)

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
}
