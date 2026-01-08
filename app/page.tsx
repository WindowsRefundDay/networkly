import { redirect } from "next/navigation"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-6 text-center">
      <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl text-foreground">
        Networkly
      </h1>
      <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
        AI-Powered Professional Networking for the Modern World.
      </p>
      <div className="flex gap-4">
        <a
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}
