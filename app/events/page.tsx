"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar, MapPin, Users, Search, Sparkles, ExternalLink } from "lucide-react"
import Image from "next/image"

const allEvents = [
  {
    id: "1",
    title: "AI Summit 2026",
    date: "Feb 15-17, 2026",
    location: "San Francisco, CA",
    type: "Conference",
    attendees: 5000,
    image: "/tech-conference.png",
    description: "The largest AI conference on the West Coast featuring industry leaders and cutting-edge research.",
    matchScore: 95,
    registered: false,
  },
  {
    id: "2",
    title: "TreeHacks 2026",
    date: "Feb 21-23, 2026",
    location: "Stanford University",
    type: "Hackathon",
    attendees: 1500,
    image: "/hackathon-event.png",
    description: "Stanford's premier hackathon bringing together the brightest minds in tech.",
    matchScore: 92,
    registered: true,
  },
  {
    id: "3",
    title: "Women in Tech Networking",
    date: "Jan 25, 2026",
    location: "Virtual",
    type: "Networking",
    attendees: 300,
    image: "/networking-event.png",
    description: "Connect with inspiring women leaders in the tech industry.",
    matchScore: 78,
    registered: false,
  },
  {
    id: "4",
    title: "ML Research Workshop",
    date: "Mar 5, 2026",
    location: "Berkeley, CA",
    type: "Workshop",
    attendees: 150,
    image: "/workshop-event.png",
    description: "Hands-on workshop covering the latest advances in machine learning research.",
    matchScore: 88,
    registered: false,
  },
]

const typeColors: Record<string, string> = {
  Conference: "bg-primary/10 text-primary",
  Hackathon: "bg-secondary/10 text-secondary",
  Networking: "bg-amber-500/10 text-amber-500",
  Workshop: "bg-rose-500/10 text-rose-500",
}

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [events, setEvents] = useState(allEvents)

  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.type.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleRegister = (id: string) => {
    setEvents(events.map((e) => (e.id === id ? { ...e, registered: !e.registered } : e)))
  }

  return (
    <div className="space-y-6">
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
          <Card key={event.id} className="border-border overflow-hidden hover:shadow-lg transition-shadow">
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
                >
                  {event.registered ? "Registered" : "Register"}
                </Button>
                <Button variant="outline" size="icon" className="bg-transparent">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
