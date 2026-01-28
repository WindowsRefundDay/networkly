import { getEvents } from "@/app/actions/events"
import EventsClient from "./events-client"

export const metadata = {
  title: "Events | Networkly",
  description: "Discover and register for events, hackathons, and workshops.",
}

export default async function EventsPage() {
  const events = await getEvents()
  
  return <EventsClient initialEvents={events} />
}
