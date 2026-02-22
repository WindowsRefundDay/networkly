"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

interface ShareProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
}

export function ShareProfileDialog({ open, onOpenChange, userName }: ShareProfileDialogProps) {
  const [copied, setCopied] = useState(false)
  
  // Get the current URL or construct profile URL
  const profileUrl = typeof window !== "undefined" 
    ? window.location.href 
    : ""

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy link")
    }
  }

  const handleShare = async (platform: "twitter" | "linkedin") => {
    const text = `Check out ${userName}'s profile!`
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
    }
    
    window.open(urls[platform], "_blank", "width=600,height=400")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Profile</DialogTitle>
          <DialogDescription>
            Share your profile with others via link or social media.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex gap-2">
            <Input
              value={profileUrl}
              readOnly
              className="bg-muted"
            />
            <Button onClick={handleCopy} variant="outline" size="icon">
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => handleShare("twitter")}
            >
              Share on X
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => handleShare("linkedin")}
            >
              Share on LinkedIn
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
