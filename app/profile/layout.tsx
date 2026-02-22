import type React from "react"

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#05050A] min-h-screen text-slate-200 font-sans selection:bg-cyan-500/30">
      {children}
    </div>
  )
}
