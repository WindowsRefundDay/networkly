"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image"
import {
  Home,
  User,
  Briefcase,
  FolderKanban,
  MessageSquare,
  Calendar,
  BarChart3,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "next-themes"
import { useHasMounted } from "@/hooks/use-has-mounted"

const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Opportunities", href: "/opportunities", icon: Briefcase },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "AI Assistant", href: "/assistant", icon: Sparkles },
  { name: "Network", href: "/network", icon: MessageSquare },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
]

interface SidebarProps {
  isCollapsed?: boolean
  toggleCollapse?: () => void
}

export function Sidebar({ isCollapsed = false, toggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useUser()
  const { theme } = useTheme()
  const hasMounted = useHasMounted()


  const userName = user?.fullName || user?.firstName || "User"
  const userAvatar = user?.imageUrl || "/placeholder.svg"
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase()

  // Full logo for expanded sidebar
  const logoSrc = hasMounted && theme === 'dark' ? '/networkly-logo-dark.png' : '/networkly-logo.png'
  // Mini logo for collapsed sidebar
  const logoMiniSrc = hasMounted && theme === 'dark' ? '/networkly-logo-mini.png' : '/networkly-logo-mini-dark.png'

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/50 bg-card/80 backdrop-blur-xl transition-all duration-300",
        isCollapsed ? "w-[80px]" : "w-64"
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-border px-6", isCollapsed ? "justify-center px-0" : "gap-2")}>
        {!isCollapsed ? (
          <Image
            src={logoSrc}
            alt="Networkly"
            width={120}
            height={40}
            className="object-contain"
            priority
          />
        ) : (
          <Image
            src={logoMiniSrc}
            alt="Networkly"
            width={40}
            height={40}
            className="object-contain"
            priority
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const LinkContent = (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            )

            if (isCollapsed) {
              return (
                <Tooltip key={item.name} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {LinkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <div key={item.name}>{LinkContent}</div>
          })}
        </nav>
      </div>

      <div className="border-t border-border p-4 space-y-4">
        {toggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="w-full flex items-center justify-center h-8 hover:bg-muted"
            onClick={toggleCollapse}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            isCollapsed && "justify-center px-0"
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!isCollapsed && "Settings"}
        </Link>

        <div className={cn("flex items-center gap-3 rounded-lg bg-muted/50 p-3", isCollapsed && "justify-center p-2 bg-transparent")}>
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || ""}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
