"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { ensureUserRecord } from "@/app/actions/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const searchParams = useSearchParams()
    const redirect = searchParams.get("redirect") || "/dashboard"
    const supabase = createClient()

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError("")

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) {
                setError(signInError.message)
                setLoading(false)
                return
            }

            const ensureUserPromise = ensureUserRecord().catch((e) => {
                console.warn("Could not ensure user record:", e)
            })

            await Promise.race([
                ensureUserPromise,
                new Promise((resolve) => setTimeout(resolve, 2000)),
            ])

            window.location.href = redirect
        } catch (e) {
            console.error("Login error:", e)
            setError("An unexpected error occurred. Please try again.")
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 shadow-lg">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-semibold">Welcome back</h1>
                    <p className="text-sm text-muted-foreground">Sign in to your account</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="email">
                            Email
                        </label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="password">
                            Password
                        </label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    {error ? <p className="text-sm text-destructive">{error}</p> : null}
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Signing in..." : "Sign in"}
                    </Button>
                </form>

                <div className="space-y-3">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" disabled>
                        <span className="flex flex-col items-center gap-1">
                            <span className="line-through">Continue with Google</span>
                            <span className="text-xs text-muted-foreground">Coming soon</span>
                        </span>
                    </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <a className="text-primary hover:underline" href={`/signup?redirect=${encodeURIComponent(redirect)}`}>
                        Sign up
                    </a>
                </p>
            </div>
        </div>
    )
}
