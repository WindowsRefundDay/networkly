"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { SlidersHorizontal, RotateCcw, X, Sparkles } from "lucide-react"

const opportunityTypes = ["Internship", "Fellowship", "Scholarship", "Competition", "Research", "Volunteer"]
const locations = ["Remote", "San Francisco, CA", "New York, NY", "Boston, MA", "London, UK"]

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

  const activeFiltersCount = selectedTypes.length + selectedLocations.length + (minMatchScore > 0 ? 1 : 0)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 border-dashed">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary/10 text-primary">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center justify-between p-4 border-b">
           <h4 className="font-semibold">Filter Opportunities</h4>
           {activeFiltersCount > 0 && (
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={handleReset}
               className="h-8 px-2 text-muted-foreground hover:text-foreground"
             >
               <RotateCcw className="h-3 w-3 mr-1" />
               Reset
             </Button>
           )}
        </div>
        
        <div className="p-4 space-y-6">
          {/* Match Score */}
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Minimum Match Score</Label>
                <span className="text-xs text-primary font-medium">{minMatchScore}%</span>
             </div>
             <Slider
                value={[minMatchScore]}
                onValueChange={(value) => onMatchScoreChange(value[0])}
                max={100}
                step={5}
                className="w-full"
              />
          </div>
          
          <Separator />

          {/* Types */}
          <div className="space-y-3">
             <Label className="text-sm font-medium">Opportunity Type</Label>
             <div className="grid grid-cols-2 gap-2">
                {opportunityTypes.map((type) => (
                   <div key={type} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`filter-${type}`} 
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={() => handleTypeToggle(type)}
                      />
                      <Label htmlFor={`filter-${type}`} className="text-sm font-normal text-muted-foreground cursor-pointer">
                        {type}
                      </Label>
                   </div>
                ))}
             </div>
          </div>

          <Separator />

          {/* Locations */}
          <div className="space-y-3">
             <Label className="text-sm font-medium">Location</Label>
             <div className="grid grid-cols-1 gap-2">
                {locations.map((location) => (
                   <div key={location} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`filter-${location}`} 
                        checked={selectedLocations.includes(location)}
                        onCheckedChange={() => handleLocationToggle(location)}
                      />
                      <Label htmlFor={`filter-${location}`} className="text-sm font-normal text-muted-foreground cursor-pointer">
                        {location}
                      </Label>
                   </div>
                ))}
             </div>
          </div>
        </div>

        <div className="p-4 border-t bg-muted/50">
           <Button className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              Show Results
           </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
