'use client'

import { MotionConfig } from "framer-motion"

export function DashboardMotionShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div>
        {children}
      </div>
    </MotionConfig>
  )
}
