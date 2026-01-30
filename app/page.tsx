import { KnownBugsModal } from "@/components/ui/known-bugs-modal"

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 space-y-8 text-center">
      <KnownBugsModal />
      <div className="flex justify-center">
        <img
          src="/networkly-welcome.png"
          alt="Networkly"
          className="h-72 object-contain dark:hidden"
        />
        <img
          src="/networkly-welcome-dark.png"
          alt="Networkly"
          className="h-72 object-contain hidden dark:block"
        />
      </div>
      <div className="flex gap-4">
        <a
          href="/dashboard"
          className="inline-flex h-12 items-center justify-center rounded-md glass-button px-10 type-small shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Go to Dashboard
        </a>
      </div>

      {/* Build version */}
      <div className="fixed bottom-4 right-4">
        <code className="type-muted text-xs font-mono">
          Networkly build 0.0.1 @1/26/26 THIS IS A TEST BUILD AND WONT REPRESENT THE FINAL PRODUCT
        </code>
      </div>
    </div>
  )
}

