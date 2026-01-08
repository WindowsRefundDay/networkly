"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, MoreHorizontal } from "lucide-react"
import { currentUser } from "@/lib/mock-data"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const typeColors: Record<string, string> = {
  Research: "bg-primary/10 text-primary",
  Leadership: "bg-secondary/10 text-secondary",
  Technical: "bg-amber-500/10 text-amber-500",
  Volunteer: "bg-emerald-500/10 text-emerald-500",
}

export function ExtracurricularsSection() {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Experience & Activities</CardTitle>
        <Button size="sm" variant="outline" className="gap-1 bg-transparent">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentUser.extracurriculars.map((activity, index) => (
          <div
            key={activity.id}
            className={`flex gap-4 ${index !== currentUser.extracurriculars.length - 1 ? "pb-4 border-b border-border" : ""}`}
          >
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={activity.logo || "/placeholder.svg"} alt={activity.organization} />
              <AvatarFallback className="rounded-lg">{activity.organization[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-foreground">{activity.title}</h4>
                  <p className="text-sm text-muted-foreground">{activity.organization}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${typeColors[activity.type] || "bg-muted text-muted-foreground"} border-0`}>
                    {activity.type}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {activity.startDate} - {activity.endDate}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{activity.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
