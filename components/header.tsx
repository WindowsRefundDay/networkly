"use client"

import { useState, useCallback, useEffect } from "react"
import { Bell, Search, MessageCircle, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useSupabaseUser } from "@/hooks/use-supabase-user"
import { useHasMounted } from "@/hooks/use-has-mounted"
import { SearchResultsDropdown } from "@/components/search/search-results-dropdown"
import { globalSearch, type SearchResults } from "@/app/actions/search"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"

export function Header() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { user, signOut } = useSupabaseUser()
  const hasMounted = useHasMounted()

  const userName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "User"
  const userEmail = user?.email || ""
  const userAvatar = (user?.user_metadata?.avatar_url as string | undefined) || "/placeholder.svg"
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase()

  const performSearch = useDebouncedCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const results = await globalSearch({ query: query.trim(), type: "all" })
      setSearchResults(results)
    } catch (error) {
      console.error("[Header] Search error:", error)
      setSearchResults(null)
    } finally {
      setIsSearching(false)
    }
  }, 300)

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (value.trim().length >= 2) {
      setIsSearchOpen(true)
      performSearch(value)
    } else {
      setIsSearchOpen(false)
      setSearchResults(null)
    }
  }

  const handleCloseSearch = () => {
    setIsSearchOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.search-container')) {
        setIsSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-card/80 backdrop-blur-xl px-6">
      <div className="relative flex-1 max-w-md search-container">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="search"
          placeholder="Search people, opportunities, projects..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim().length >= 2) {
              setIsSearchOpen(true)
            }
          }}
          className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
        />
        
        <SearchResultsDropdown
          isOpen={isSearchOpen}
          isLoading={isSearching}
          results={searchResults}
          onClose={handleCloseSearch}
          onSelectResult={() => {
            setIsSearchOpen(false)
            setSearchQuery("")
            setSearchResults(null)
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create</span>
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <MessageCircle className="h-5 w-5" />
          <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs" variant="destructive">
            3
          </Badge>
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs" variant="destructive">
            5
          </Badge>
        </Button>

        {hasMounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{userName}</span>
                  <span className="text-xs font-normal text-muted-foreground">{userEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Help & Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={async () => {
                  await signOut()
                  window.location.href = "/login"
                }}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!hasMounted && (
          <Button variant="ghost" className="relative h-9 w-9 rounded-full opacity-0">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </Button>
        )}
      </div>
    </header>
  )
}

