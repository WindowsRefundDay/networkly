"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Copy, Check } from "lucide-react"
import { generateMentorEmail } from "@/app/actions/mentor-email"
import { toast } from "sonner"

interface EmailTemplateModalProps {
  mentorId: string
  mentorName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmailTemplateModal({ mentorId, mentorName, open, onOpenChange }: EmailTemplateModalProps) {
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [copied, setCopied] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const result = await generateMentorEmail(mentorId)
      if (result.success && result.email) {
        setSubject(result.email.subject)
        setBody(result.email.body)
        setHasGenerated(true)
      } else {
        toast.error("Failed to generate email template")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    const fullText = `Subject: ${subject}\n\n${body}`
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    toast.success("Email copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contact {mentorName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!hasGenerated ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">
                Generate a personalized cold email based on your profile and the mentor's research.
              </p>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Generate Draft
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea 
                  value={body} 
                  onChange={(e) => setBody(e.target.value)} 
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
            </>
          )}
        </div>

        {hasGenerated && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setHasGenerated(false)}>
              Back
            </Button>
            <Button onClick={handleCopy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy to Clipboard
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
