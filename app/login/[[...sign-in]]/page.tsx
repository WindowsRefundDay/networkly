"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirect = searchParams.get("redirect") || "/dashboard"
    const supabase = createClient()

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError("")

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (signInError) {
            setError(signInError.message)
            setLoading(false)
            return
        }

        router.push(redirect)
        router.refresh()
    }

    const handleGoogleLogin = async () => {
        setLoading(true)
        setError("")
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
            },
        })

        if (oauthError) {
            setError(oauthError.message)
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
                    <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                        Continue with Google
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
