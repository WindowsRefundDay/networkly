import Link from "next/link"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <GlassCard className="w-full max-w-md p-8 text-center space-y-6">
        <div className="space-y-2">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">404</h1>
            <h2 className="type-h2">Page not found</h2>
        </div>
        <p className="type-muted">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
        </p>
        <Button asChild>
            <Link href="/dashboard">Return Home</Link>
        </Button>
      </GlassCard>
    </main>
  )
}
