'use client'

import { useEffect, useRef, useState } from "react"
import { MotionConfig } from "framer-motion"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { DASHBOARD_EASE } from "./motion-presets"

export function DashboardMotionShell({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion()
  const [replayKey, setReplayKey] = useState(0)
  const lastReplay = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion) {
      return
    }

    let frame = 0

    const replay = () => {
      const now = performance.now()
      if (now - lastReplay.current < 320) {
        return
      }

      lastReplay.current = now
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setReplayKey((current) => current + 1)
      })
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        replay()
      }
    }

    window.addEventListener("focus", replay)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener("focus", replay)
      document.removeEventListener("visibilitychange", handleVisibility)
      cancelAnimationFrame(frame)
    }
  }, [prefersReducedMotion])

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.45, ease: DASHBOARD_EASE }}>
      <div key={replayKey} data-motion-cycle={replayKey}>
        {children}
      </div>
    </MotionConfig>
  )
}
