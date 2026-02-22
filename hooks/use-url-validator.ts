"use client"

import { useState, useCallback } from "react"

interface ValidationState {
  validating: boolean
  deadLink: string | null
}

export function useUrlValidator() {
  const [state, setState] = useState<ValidationState>({
    validating: false,
    deadLink: null,
  })

  const validateAndOpen = useCallback(
    async (opportunityId: string, url: string, title?: string, company?: string) => {
      if (!url) return

      setState({ validating: true, deadLink: null })

      try {
        const res = await fetch("/api/opportunities/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunityId, url }),
        })

        const data = await res.json()

        if (data.alive) {
          // URL is alive — open it (use finalUrl if redirect was followed)
          window.open(data.finalUrl || url, "_blank")
          setState({ validating: false, deadLink: null })
        } else {
          // URL is dead — show error state
          setState({ validating: false, deadLink: url })
        }
      } catch {
        // Validation itself failed — open anyway (fail open)
        window.open(url, "_blank")
        setState({ validating: false, deadLink: null })
      }
    },
    []
  )

  const clearDeadLink = useCallback(() => {
    setState((prev) => ({ ...prev, deadLink: null }))
  }, [])

  return {
    validateAndOpen,
    validating: state.validating,
    deadLink: state.deadLink,
    clearDeadLink,
  }
}
