'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import type React from 'react'

const WelcomeModal = dynamic(
  () => import('@/components/ui/welcome-modal').then((module) => module.WelcomeModal),
  { ssr: false }
)

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarCollapsed((previousState) => !previousState)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <WelcomeModal />
      <Sidebar isCollapsed={isSidebarCollapsed} toggleCollapse={toggleSidebar} />
      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{
          marginLeft: isSidebarCollapsed ? '80px' : '256px',
        }}
      >
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
