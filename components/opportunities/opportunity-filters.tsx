"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Sparkles, RotateCcw } from "lucide-react"

const opportunityTypes = ["Internship", "Fellowship", "Scholarship", "Competition", "Full-time"]
const locations = ["Remote", "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX"]

interface OpportunityFiltersProps {
  selectedTypes: string[]
  onTypesChange: (types: string[]) => void
  selectedLocations: string[]
  onLocationsChange: (locations: string[]) => void
  minMatchScore: number
  onMatchScoreChange: (score: number) => void
}

export function OpportunityFilters({
  selectedTypes,
  onTypesChange,
  selectedLocations,
  onLocationsChange,
  minMatchScore,
  onMatchScoreChange,
}: OpportunityFiltersProps) {
  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type))
    } else {
      onTypesChange([...selectedTypes, type])
    }
  }

  const handleLocationToggle = (location: string) => {
    if (selectedLocations.includes(location)) {
      onLocationsChange(selectedLocations.filter((l) => l !== location))
    } else {
      onLocationsChange([...selectedLocations, location])
    }
  }

  const handleReset = () => {
    onTypesChange([])
    onLocationsChange([])
    onMatchScoreChange(0)
  }

  return (
    <Card className="border-border sticky top-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Filters</CardTitle>
        <Button size="sm" variant="ghost" onClick={handleReset} className="gap-1 text-muted-foreground">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">AI Match Score</h4>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Min {minMatchScore}%</span>
          </div>
          <Slider
            value={[minMatchScore]}
            onValueChange={(value) => onMatchScoreChange(value[0])}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Opportunity Type</h4>
          <div className="space-y-2">
            {opportunityTypes.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={selectedTypes.includes(type)}
                  onCheckedChange={() => handleTypeToggle(type)}
                />
                <Label htmlFor={type} className="text-sm text-muted-foreground cursor-pointer">
                  {type}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Location</h4>
          <div className="space-y-2">
            {locations.map((location) => (
              <div key={location} className="flex items-center space-x-2">
                <Checkbox
                  id={location}
                  checked={selectedLocations.includes(location)}
                  onCheckedChange={() => handleLocationToggle(location)}
                />
                <Label htmlFor={location} className="text-sm text-muted-foreground cursor-pointer">
                  {location}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full gap-1">
          <Sparkles className="h-4 w-4" />
          AI Recommend
        </Button>
      </CardContent>
    </Card>
  )
}
