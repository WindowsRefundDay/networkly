import type React from "react"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { Toaster } from "sonner"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"] })
const _plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Networkly - AI-Powered Professional Networking",
  description: "Connect, grow, and succeed with AI-powered networking, opportunity discovery, and career guidance.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers()
  const nonce = headersList.get("x-nonce") ?? undefined

  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      nonce={nonce}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`font-sans antialiased`}>
          {children}
          <Toaster position="top-center" />
        </body>
      </html>
    </ClerkProvider>
  )
}

