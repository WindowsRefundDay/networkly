"use client"

import * as React from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved) {
      setIsCollapsed(saved === "true")
    }
  }, [])

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", String(newState))
  }

  if (!isMounted) {
      // Render default state (expanded) during SSR/hydration to match server
      return (
       <div className="h-screen overflow-hidden bg-background">
         <Sidebar isCollapsed={false} toggleCollapse={toggleCollapse} />
         <div className="pl-64 h-screen flex flex-col">
           <Header />
           <main className="flex-1 p-6 overflow-hidden">{children}</main>
         </div>
       </div>
      )
   }

  return (
    <div className="h-screen overflow-hidden bg-background">
      <Sidebar 
        isCollapsed={isCollapsed} 
        toggleCollapse={toggleCollapse} 
      />
      <div
        className={cn(
          "transition-[padding] duration-300 ease-in-out h-screen flex flex-col",
          isCollapsed ? "pl-[80px]" : "pl-64"
        )}
      >
        <Header />
        <main className="flex-1 p-6 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
