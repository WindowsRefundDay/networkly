"use client"

import { useState, useMemo, useRef } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar, MapPin, Users, Search, Sparkles, ExternalLink, Loader2, Filter } from "lucide-react"
import Image from "next/image"
import { registerForEvent, unregisterFromEvent } from "@/app/actions/events"
import { DiscoveryTriggerCard } from "@/components/opportunities/discovery-trigger-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimatePresence, motion } from "framer-motion"
import { searchEvents } from "@/app/actions/event-discovery"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"

interface Event {
  id: string
  title: string
  date: string
  location: string
  type: string
  attendees: number
  image: string | null
  description: string | null
  matchScore: number
  registered: boolean
  registrationStatus: string | null
  isExternal?: boolean 
  url?: string
}

interface EventsClientProps {
  initialEvents: any[]
}

const typeColors: Record<string, string> = {
  Conference: "bg-primary/10 text-primary",
  Hackathon: "bg-secondary/10 text-secondary",
  Networking: "bg-amber-500/10 text-amber-500",
  Workshop: "bg-rose-500/10 text-rose-500",
  Event: "bg-blue-500/10 text-blue-500",
  Competition: "bg-purple-500/10 text-purple-500",
}

export default function EventsClient({ initialEvents }: EventsClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [locationFilter, setLocationFilter] = useState("all")
  const [events, setEvents] = useState<Event[]>(initialEvents.map(e => ({ ...e, isExternal: false })))
  const [discoveredEvents, setDiscoveredEvents] = useState<Event[]>([])
  const [registering, setRegistering] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const allEvents = useMemo(() => {
    const platformIds = new Set(events.map(e => e.id));
    const uniqueDiscovered = discoveredEvents.filter(e => !platformIds.has(e.id));
    return [...events, ...uniqueDiscovered];
  }, [events, discoveredEvents]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const matchesSearch = 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.type.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesLocation = 
        locationFilter === "all" ||
        (locationFilter === "online" && (event.location.toLowerCase().includes("remote") || event.location.toLowerCase().includes("online"))) ||
        (locationFilter === "in-person" && !(event.location.toLowerCase().includes("remote") || event.location.toLowerCase().includes("online")));

      return matchesSearch && matchesLocation;
    });
  }, [allEvents, searchQuery, locationFilter]);

  const handleRegister = async (id: string) => {
    const event = events.find((e) => e.id === id)
    if (!event) return

    setRegistering(id)
    try {
      if (event.registered) {
        await unregisterFromEvent(id)
        setEvents(events.map((e) => (e.id === id ? { ...e, registered: false } : e)))
      } else {
        await registerForEvent(id)
        setEvents(events.map((e) => (e.id === id ? { ...e, registered: true } : e)))
      }
    } catch (error) {
      console.error("Failed to update registration:", error)
    } finally {
      setRegistering(null)
    }
  }

  const handleNewOpportunity = (opp: { id: string; title: string; organization: string; type: string }) => {
    const newEvent: Event = {
      id: opp.id,
      title: opp.title,
      date: "Recently Added",
      location: "Remote/TBD",
      type: opp.type || "Event",
      attendees: 0,
      image: null,
      description: `Discovered opportunity at ${opp.organization}`,
      matchScore: 0,
      registered: false,
      registrationStatus: null,
      isExternal: true,
      url: `/opportunities/${opp.id}`
    }
    
    setDiscoveredEvents(prev => [newEvent, ...prev])
  }

  const performRemoteSearch = useDebouncedCallback(async (query: string) => {
    if (!query || query.length < 3) return;
    
    setIsSearching(true);
    try {
        const result = await searchEvents(query);
        if (result.success && result.data) {
            const mapped: Event[] = result.data.map((item: any) => ({
                id: item.id,
                title: item.title,
                date: item.start_date || "TBD",
                location: item.location || (item.is_remote ? "Online" : "Unknown"),
                type: item.type || "Event",
                attendees: 0,
                image: item.image,
                description: item.description,
                matchScore: 0,
                registered: false,
                registrationStatus: null,
                isExternal: true,
                url: item.url || `/opportunities/${item.id}`
            }));
            
            setDiscoveredEvents(prev => {
                const existingIds = new Set(prev.map(e => e.id));
                const uniqueNew = mapped.filter(e => !existingIds.has(e.id));
                return [...uniqueNew, ...prev];
            });
        }
    } catch (error) {
        console.error("Remote search failed", error);
    } finally {
        setIsSearching(false);
    }
  }, 1000);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    performRemoteSearch(val);
  }

  return (
    <div className="space-y-6 container mx-auto px-4 sm:px-6 max-w-7xl py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Events & Conferences</h1>
          <p className="text-muted-foreground">Discover events matched to your interests</p>
        </div>
      </div>

      <DiscoveryTriggerCard 
        onNewOpportunity={handleNewOpportunity}
        initialQuery={searchQuery}
        className="mb-8"
        compact={!searchQuery}
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-background/50 backdrop-blur-sm p-4 rounded-xl border border-border/50 sticky top-4 z-30 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
          {isSearching && (
             <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="online">Online / Remote</SelectItem>
                    <SelectItem value="in-person">In Person</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
        {filteredEvents.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            layout
          >
          <GlassCard className="border-border overflow-hidden h-full flex flex-col">
            <div className="relative aspect-video shrink-0">
              <Image src={event.image || "/placeholder.svg"} alt={event.title} fill className="object-cover" />
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge className={`${typeColors[event.type] || "bg-primary/10 text-primary"} border-0`}>{event.type}</Badge>
                {event.isExternal && <Badge variant="secondary" className="bg-background/80 backdrop-blur">Discovered</Badge>}
              </div>
              <div className="absolute top-3 right-3">
                <div className="flex items-center gap-1 rounded-full bg-card/90 px-2 py-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-primary">{event.matchScore}% match</span>
                </div>
              </div>
            </div>
            <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg text-foreground line-clamp-2">{event.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-auto pt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {event.date}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </span>
                {event.attendees > 0 && (
                    <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {event.attendees.toLocaleString()}
                    </span>
                )}
              </div>
              
              <div className="flex gap-2 pt-2">
                {event.isExternal ? (
                    <Button className="flex-1" variant="outline" asChild>
                        <a href={event.url} target={event.url?.startsWith("http") ? "_blank" : "_self"} rel="noopener noreferrer">
                            View Details <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                    </Button>
                ) : (
                    <>
                    <Button
                    className={`flex-1 ${event.registered ? "bg-secondary hover:bg-secondary/90" : ""}`}
                    onClick={() => handleRegister(event.id)}
                    disabled={registering === event.id}
                    >
                    {registering === event.id ? (
                        <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {event.registered ? "Unregistering..." : "Registering..."}
                        </>
                    ) : event.registered ? (
                        "Registered"
                    ) : (
                        "Register"
                    )}
                    </Button>
                    <Button variant="outline" size="icon" className="bg-transparent">
                    <ExternalLink className="h-4 w-4" />
                    </Button>
                    </>
                )}
              </div>
            </CardContent>
          </GlassCard>
          </motion.div>
        ))}
        </AnimatePresence>
        
        {filteredEvents.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                <p>No events found. Try searching or use the Discovery tool above!</p>
            </div>
        )}
      </div>
    </div>
  )
}
