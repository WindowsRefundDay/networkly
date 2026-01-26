"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle2, Mail, Sparkles, ArrowRight } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { ensureUserRecord } from "@/app/actions/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SignupPage() {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [signupSuccess, setSignupSuccess] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirect = searchParams.get("redirect") || "/dashboard"
    const supabase = createClient()

    const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError("")

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                },
                emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
            },
        })

        if (signUpError) {
            setError(signUpError.message)
            setLoading(false)
            return
        }

        // Create user record in public.users table
        try {
            await ensureUserRecord()
        } catch (e) {
            // Non-blocking - callback will also try to create the record
            console.warn("Could not create user record immediately:", e)
        }

        setSignupSuccess(true)
        setLoading(false)
    }

    const handleGoogleSignup = async () => {
        setLoading(true)
        setError("")

        try {
            const { error: signInError } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
                },
            })

            if (signInError) {
                setError(signInError.message)
                setLoading(false)
            }
        } catch (e) {
            console.error("Google signup error:", e)
            setError("An unexpected error occurred with Google signup. Please try again.")
            setLoading(false)
        }
    }

    if (signupSuccess) {
        return (
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
                <motion.div
                    className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                >
                    <div className="space-y-4 text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center"
                        >
                            <CheckCircle2 className="w-8 h-8 text-white" />
                        </motion.div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                Welcome to Networkly! 🎉
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Your professional network journey begins now
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <motion.div
                            className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Check your inbox</p>
                                    <p className="text-xs text-muted-foreground">
                                        We've sent a verification link to <span className="font-mono bg-muted px-1 rounded">{email}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">What's next?</p>
                                    <p className="text-xs text-muted-foreground">
                                        After verifying, sign in to unlock AI-powered networking, opportunity discovery, and career insights
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="space-y-3"
                        >
                            <Button
                                onClick={() => router.push(`/login?redirect=${encodeURIComponent(redirect)}`)}
                                className="w-full relative overflow-hidden group"
                                size="lg"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    Sign In to Get Started
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>

                            <p className="text-center text-xs text-muted-foreground">
                                Can't find the email? Check your spam folder or
                                <button
                                    onClick={() => setSignupSuccess(false)}
                                    className="text-primary hover:underline ml-1"
                                >
                                    try again
                                </button>
                            </p>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 shadow-lg">
                <div className="space-y-4 text-center">
                    <div className="flex justify-center">
                        <img
                            src="/networkly-logo.png"
                            alt="Networkly"
                            className="h-10 object-contain dark:hidden"
                        />
                        <img
                            src="/networkly-logo-dark.png"
                            alt="Networkly"
                            className="h-10 object-contain hidden dark:block"
                        />
                    </div>
                    <h1 className="text-2xl font-semibold">Create your account</h1>
                    <p className="text-sm text-muted-foreground">Start building your network</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="name">
                            Full name
                        </label>
                        <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Jane Doe"
                            required
                        />
                    </div>
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
                        {loading ? "Creating account..." : "Create account"}
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
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleSignup}
                        disabled={loading}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                                    fill="#EA4335"
                                />
                                <path d="M1 1h22v22H1z" fill="none" />
                            </svg>
                            Continue with Google
                        </span>
                    </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <a className="text-primary hover:underline" href={`/login?redirect=${encodeURIComponent(redirect)}`}>
                        Sign in
                    </a>
                </p>
            </div>
        </div>
    )
}
