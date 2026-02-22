import type React from "react"
import { AppShell } from "@/components/layout/app-shell"

export default function OpportunitiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
