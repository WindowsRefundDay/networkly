import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPlus, Sparkles } from "lucide-react"
import { suggestedConnections } from "@/lib/mock-data"

export function SuggestedConnections() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          AI-Suggested Connections
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestedConnections.map((connection) => (
          <div key={connection.id} className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={connection.avatar || "/placeholder.svg"} alt={connection.name} />
              <AvatarFallback>{connection.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <h4 className="font-medium text-foreground">{connection.name}</h4>
              <p className="text-xs text-muted-foreground line-clamp-1">{connection.headline}</p>
              <p className="text-xs text-primary">{connection.mutualConnections} mutual connections</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1 bg-transparent">
              <UserPlus className="h-4 w-4" />
              Connect
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
