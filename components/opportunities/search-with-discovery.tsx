"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Search, ArrowRight, Globe, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchWithDiscoveryProps {
  value: string
  onChange: (value: string) => void
  onTriggerSearch: (query: string) => void
  isSearching?: boolean
  placeholder?: string
  className?: string
}

const HOLD_DURATION_MS = 3000 // 3 seconds to trigger

export function SearchWithDiscovery({
  value,
  onChange,
  onTriggerSearch,
  isSearching = false,
  placeholder = "Search roles, companies, skills...",
  className
}: SearchWithDiscoveryProps) {
  const [isHolding, setIsHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const holdStartRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Show hint when there's a search query with 3+ characters
  useEffect(() => {
    if (value.length >= 3 && !isSearching) {
      const timer = setTimeout(() => setShowHint(true), 1500)
      return () => clearTimeout(timer)
    } else {
      setShowHint(false)
    }
  }, [value, isSearching])

  const startHold = useCallback(() => {
    if (value.length < 3 || isSearching) return
    
    setIsHolding(true)
    holdStartRef.current = Date.now()
    
    // Animation loop for progress
    const updateProgress = () => {
      if (!holdStartRef.current) return
      
      const elapsed = Date.now() - holdStartRef.current
      const progress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100)
      setHoldProgress(progress)
      
      if (progress < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress)
      }
    }
    animationFrameRef.current = requestAnimationFrame(updateProgress)
    
    // Trigger search after hold duration
    holdTimeoutRef.current = setTimeout(() => {
      onTriggerSearch(value)
      endHold()
    }, HOLD_DURATION_MS)
  }, [value, isSearching, onTriggerSearch])

  const endHold = useCallback(() => {
    setIsHolding(false)
    setHoldProgress(0)
    holdStartRef.current = null
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
  }, [])

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" && value.length >= 3 && !isSearching && !isHolding) {
      e.preventDefault()
      startHold()
    } else if (e.key === "Enter" && value.length >= 3 && !isSearching) {
      // Optional: trigger search immediately on Enter
      // onTriggerSearch(value)
    }
  }, [value, isSearching, isHolding, startHold])

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      endHold()
    }
  }, [endHold])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          className={cn(
            "pl-10 pr-12 h-10 bg-background transition-all",
            isHolding && "ring-2 ring-primary/50"
          )}
          disabled={isSearching}
        />
        
        {/* Right side indicator */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : value.length >= 3 ? (
            <div 
              className={cn(
                "flex items-center gap-1 text-xs text-muted-foreground transition-opacity",
                isHolding ? "opacity-100" : "opacity-60 hover:opacity-100"
              )}
            >
              <ArrowRight className={cn(
                "h-4 w-4 transition-colors",
                isHolding && "text-primary"
              )} />
            </div>
          ) : null}
        </div>
        
        {/* Hold progress bar */}
        <AnimatePresence>
          {isHolding && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: holdProgress / 100 }}
              exit={{ scaleX: 0, opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 h-1 bg-primary origin-left rounded-b-md"
              style={{ transformOrigin: "left" }}
            />
          )}
        </AnimatePresence>
      </div>
      
      {/* Hint tooltip */}
      <AnimatePresence>
        {showHint && !isHolding && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 right-0 mt-2 z-20"
          >
            <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Hold <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono mx-1">→</kbd> 
                  for 3s to search the web
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Holding state feedback */}
      <AnimatePresence>
        {isHolding && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 right-0 mt-2 z-20"
          >
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">
                    {holdProgress < 100 
                      ? `Keep holding... ${Math.ceil((HOLD_DURATION_MS - (holdProgress / 100 * HOLD_DURATION_MS)) / 1000)}s`
                      : "Launching search!"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Searching for "{value}"
                  </p>
                </div>
                <div className="text-lg font-bold text-primary">
                  {Math.round(holdProgress)}%
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
