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
import { SlidersHorizontal, RotateCcw, Sparkles, Zap, Clock, Calendar, XCircle } from "lucide-react"
import { useHasMounted } from "@/hooks/use-has-mounted"
import { cn } from "@/lib/utils"

const opportunityTypes = ["Internship", "Fellowship", "Scholarship", "Competition", "Research", "Volunteer"]
const locations = ["Remote", "San Francisco, CA", "New York, NY", "Boston, MA", "London, UK"]

const difficultyLevels = [
  { value: "beginner", label: "Beginner", icon: "🟢", description: "Open to all" },
  { value: "intermediate", label: "Intermediate", icon: "🟡", description: "Some experience" },
  { value: "advanced", label: "Advanced", icon: "🔴", description: "Highly selective" },
]

const deadlineStatuses = [
  { value: "urgent", label: "Urgent", icon: <Zap className="h-3 w-3" />, color: "text-red-500" },
  { value: "soon", label: "Closing Soon", icon: <Clock className="h-3 w-3" />, color: "text-amber-500" },
  { value: "flexible", label: "Flexible", icon: <Calendar className="h-3 w-3" />, color: "text-emerald-500" },
  { value: "expired", label: "Expired", icon: <XCircle className="h-3 w-3" />, color: "text-slate-400" },
]

interface OpportunityFiltersProps {
  selectedTypes: string[]
  onTypesChange: (types: string[]) => void
  selectedLocations: string[]
  onLocationsChange: (locations: string[]) => void
  minMatchScore: number
  onMatchScoreChange: (score: number) => void
  // New: Smart Filtering Props (Phase 2)
  selectedDifficulties?: string[]
  onDifficultiesChange?: (difficulties: string[]) => void
  selectedDeadlineStatuses?: string[]
  onDeadlineStatusesChange?: (statuses: string[]) => void
  hideExpired?: boolean
  onHideExpiredChange?: (hide: boolean) => void
}

export function OpportunityFilters({
  selectedTypes,
  onTypesChange,
  selectedLocations,
  onLocationsChange,
  minMatchScore,
  onMatchScoreChange,
  selectedDifficulties = [],
  onDifficultiesChange,
  selectedDeadlineStatuses = [],
  onDeadlineStatusesChange,
  hideExpired = false,
  onHideExpiredChange,
}: OpportunityFiltersProps) {
  const hasMounted = useHasMounted()

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

  const handleDifficultyToggle = (level: string) => {
    if (!onDifficultiesChange) return
    if (selectedDifficulties.includes(level)) {
      onDifficultiesChange(selectedDifficulties.filter((d) => d !== level))
    } else {
      onDifficultiesChange([...selectedDifficulties, level])
    }
  }

  const handleDeadlineToggle = (status: string) => {
    if (!onDeadlineStatusesChange) return
    if (selectedDeadlineStatuses.includes(status)) {
      onDeadlineStatusesChange(selectedDeadlineStatuses.filter((s) => s !== status))
    } else {
      onDeadlineStatusesChange([...selectedDeadlineStatuses, status])
    }
  }

  const handleReset = () => {
    onTypesChange([])
    onLocationsChange([])
    onMatchScoreChange(0)
    onDifficultiesChange?.([])
    onDeadlineStatusesChange?.([])
    onHideExpiredChange?.(false)
  }

  const activeFiltersCount =
    selectedTypes.length +
    selectedLocations.length +
    selectedDifficulties.length +
    selectedDeadlineStatuses.length +
    (minMatchScore > 0 ? 1 : 0) +
    (hideExpired ? 1 : 0)

  const filtersTrigger = (
    <Button variant="outline" className="gap-2 border-dashed">
      <SlidersHorizontal className="h-4 w-4" />
      Filters
      {activeFiltersCount > 0 && (
        <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary/10 text-primary">
          {activeFiltersCount}
        </Badge>
      )}
    </Button>
  )

  if (!hasMounted) {
    return filtersTrigger
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {filtersTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 max-h-[80vh] overflow-y-auto" align="start">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-popover z-10">
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

          {/* Difficulty Level (Phase 2) */}
          {onDifficultiesChange && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <span>Difficulty Level</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                    AI
                  </Badge>
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {difficultyLevels.map((level) => (
                    <div
                      key={level.value}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer",
                        selectedDifficulties.includes(level.value)
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/40 hover:border-border/60 hover:bg-muted/30"
                      )}
                      onClick={() => handleDifficultyToggle(level.value)}
                    >
                      <Checkbox
                        id={`difficulty-${level.value}`}
                        checked={selectedDifficulties.includes(level.value)}
                        onCheckedChange={() => handleDifficultyToggle(level.value)}
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`difficulty-${level.value}`}
                          className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                        >
                          {level.icon} {level.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{level.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Deadline Status (Phase 2) */}
          {onDeadlineStatusesChange && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <span>Deadline Status</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                    AI
                  </Badge>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {deadlineStatuses.map((status) => (
                    <div
                      key={status.value}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer",
                        selectedDeadlineStatuses.includes(status.value)
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/40 hover:border-border/60 hover:bg-muted/30"
                      )}
                      onClick={() => handleDeadlineToggle(status.value)}
                    >
                      <Checkbox
                        id={`deadline-${status.value}`}
                        checked={selectedDeadlineStatuses.includes(status.value)}
                        onCheckedChange={() => handleDeadlineToggle(status.value)}
                        className="shrink-0"
                      />
                      <Label
                        htmlFor={`deadline-${status.value}`}
                        className={cn("text-xs font-medium cursor-pointer flex items-center gap-1", status.color)}
                      >
                        {status.icon}
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Hide Expired Toggle */}
          {onHideExpiredChange && (
            <>
              <div
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer",
                  hideExpired
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/40 hover:border-border/60 hover:bg-muted/30"
                )}
                onClick={() => onHideExpiredChange(!hideExpired)}
              >
                <Checkbox
                  id="hide-expired"
                  checked={hideExpired}
                  onCheckedChange={(checked) => onHideExpiredChange(checked === true)}
                />
                <Label htmlFor="hide-expired" className="text-sm font-medium cursor-pointer">
                  Hide expired opportunities
                </Label>
              </div>

              <Separator />
            </>
          )}

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

        <div className="p-4 border-t bg-muted/50 sticky bottom-0">
          <Button className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            Show Results
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
