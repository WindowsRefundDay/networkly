import { SignIn } from "@clerk/nextjs"

export default function LoginPage() {
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <SignIn
                appearance={{
                    elements: {
                        rootBox: "mx-auto",
                        card: "bg-card border border-border shadow-lg",
                    }
                }}
                routing="path"
                path="/login"
                signUpUrl="/signup"
            />
        </div>
    )
}
