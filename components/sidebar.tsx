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
import { useSupabaseUser } from "@/hooks/use-supabase-user"
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
  const { user } = useSupabaseUser()
  const { theme } = useTheme()
  const hasMounted = useHasMounted()


  const userName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "User"
  const userAvatar = (user?.user_metadata?.avatar_url as string | undefined) || "/placeholder.svg"
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase()


  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/50 bg-card/80 backdrop-blur-xl transition-all duration-300",
        isCollapsed ? "w-[80px]" : "w-64"
      )}
    >
      <div className={cn("flex h-16 items-center px-6", isCollapsed ? "justify-center px-0" : "gap-3")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden">
          <Image
            src="/icon.svg"
            alt="Networkly"
            width={32}
            height={32}
            className="h-full w-full"
            priority
          />
        </div>
        {!isCollapsed && (
          <span className="text-xl font-bold tracking-tight text-foreground">
            Networkly
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-20 flex flex-col justify-center">
        <nav className="flex flex-col gap-3">
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
              <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
