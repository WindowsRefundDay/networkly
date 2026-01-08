import { SignUp } from "@clerk/nextjs"

export default function SignupPage() {
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <SignUp
                appearance={{
                    elements: {
                        rootBox: "mx-auto",
                        card: "bg-card border border-border shadow-lg",
                    }
                }}
                routing="path"
                path="/signup"
                signInUrl="/login"
            />
        </div>
    )
}
