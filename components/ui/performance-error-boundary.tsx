"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PerformanceErrorBoundaryProps {
  children: ReactNode
  className?: string
  title?: string
  message?: string
}

interface PerformanceErrorBoundaryState {
  hasError: boolean
}

export class PerformanceErrorBoundary extends Component<
  PerformanceErrorBoundaryProps,
  PerformanceErrorBoundaryState
> {
  state: PerformanceErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): PerformanceErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[PerformanceErrorBoundary]", error, errorInfo)
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div
        className={cn(
          "rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm",
          this.props.className
        )}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">
              {this.props.title || "This section failed to render"}
            </h3>
            <p className="text-muted-foreground">
              {this.props.message || "A runtime error occurred while rendering this optimized view."}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={this.handleRetry} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
