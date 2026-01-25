"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar, MapPin, Users, Search, Sparkles, ExternalLink, Loader2 } from "lucide-react"
import Image from "next/image"
import { getEvents, registerForEvent, unregisterFromEvent } from "@/app/actions/events"

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
}

const typeColors: Record<string, string> = {
  Conference: "bg-primary/10 text-primary",
  Hackathon: "bg-secondary/10 text-secondary",
  Networking: "bg-amber-500/10 text-amber-500",
  Workshop: "bg-rose-500/10 text-rose-500",
}

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      try {
        const data = await getEvents()
        setEvents(data as Event[])
      } catch (error) {
        console.error("Failed to fetch events:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.type.toLowerCase().includes(searchQuery.toLowerCase()),
  )

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

  if (loading) {
    return (
      <div className="space-y-6 container mx-auto px-4 sm:px-6 max-w-7xl py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 container mx-auto px-4 sm:px-6 max-w-7xl py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Events & Conferences</h1>
          <p className="text-muted-foreground">Discover events matched to your interests</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.map((event) => (
          <GlassCard key={event.id} className="border-border overflow-hidden">
            <div className="relative aspect-video">
              <Image src={event.image || "/placeholder.svg"} alt={event.title} fill className="object-cover" />
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge className={`${typeColors[event.type]} border-0`}>{event.type}</Badge>
              </div>
              <div className="absolute top-3 right-3">
                <div className="flex items-center gap-1 rounded-full bg-card/90 px-2 py-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-primary">{event.matchScore}% match</span>
                </div>
              </div>
            </div>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold text-lg text-foreground">{event.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {event.date}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {event.attendees.toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
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
              </div>
            </CardContent>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
