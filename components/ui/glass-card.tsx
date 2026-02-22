import React from "react"
import { cn } from "@/lib/utils"

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: "default" | "hero" | "muted" | "sidebar" | "compact"
  hover?: boolean
  glow?: boolean
}

export function GlassCard({
  children,
  className,
  variant = "default",
  hover = false,
  glow = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl transition-all duration-300",
        variant === "hero" && "bg-white/20 border-white/30",
        variant === "muted" && "bg-white/5 border-white/10",
        hover && "hover:bg-white/15 hover:border-white/40 hover:scale-[1.01]",
        glow && "after:absolute after:inset-0 after:-z-10 after:bg-primary/20 after:blur-3xl after:opacity-50",
        "relative overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
