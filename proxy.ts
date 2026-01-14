import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    "/",
    "/login(.*)",
    "/signup(.*)",
    "/api/(.*)",
])

// Generate cryptographically secure nonce for CSP
function generateNonce(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
}

export default clerkMiddleware(async (auth, request) => {
    const response = NextResponse.next()
    const nonce = generateNonce()

    // Build CSP with nonce and Clerk domains
    // Using 'strict-dynamic' allows scripts loaded by trusted scripts to execute
    const csp = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://*.clerk.accounts.dev https://challenges.cloudflare.com`,
        `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`, // unsafe-inline fallback for dynamic styles
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https:",
        "worker-src 'self' blob:",
        "frame-src https://*.clerk.accounts.dev https://challenges.cloudflare.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join("; ")

    response.headers.set("Content-Security-Policy", csp)
    response.headers.set("X-Nonce", nonce)
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

    const url = request.nextUrl

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
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
}
