import type React from "react"
import { JetBrains_Mono, Outfit } from "next/font/google"

const dashboardSans = Outfit({
  subsets: ["latin"],
  variable: "--font-dashboard-sans",
  weight: ["400", "500", "600", "700"],
})

const dashboardMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-dashboard-mono",
  weight: ["400", "500", "600"],
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${dashboardSans.variable} ${dashboardMono.variable} min-h-[100dvh] bg-zinc-950 text-zinc-200 selection:bg-blue-500/20`}
      style={{
        fontFamily: "var(--font-dashboard-sans), system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  )
}
