import Image from "next/image"

import NotFoundDark from "@/404black.png"
import NotFoundLight from "@/404white.png"

export default function NotFound() {
    return (
        <main className="flex min-h-svh items-center justify-center bg-background p-6">
            <div className="flex w-full max-w-xl items-center justify-center">
                <Image
                    src={NotFoundDark}
                    alt="Page not found"
                    priority
                    className="block h-auto w-full dark:hidden"
                    sizes="(min-width: 1024px) 720px, 100vw"
                />
                <Image
                    src={NotFoundLight}
                    alt="Page not found"
                    priority
                    className="hidden h-auto w-full dark:block"
                    sizes="(min-width: 1024px) 720px, 100vw"
                />
            </div>
        </main>
    )
}
