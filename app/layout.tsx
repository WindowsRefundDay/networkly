import type React from "react"
import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const _inter = Inter({ subsets: ["latin"] })
const _plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Networkly - AI-Powered Professional Networking",
  description: "Connect, grow, and succeed with AI-powered networking, opportunity discovery, and career guidance.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
                try {
                  if (localStorage.getItem('theme') === 'dark' || ((!('theme' in localStorage) || localStorage.getItem('theme') === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (_) {}
              `,
          }}
        />
      </head>
      <body className={`font-sans antialiased`}>
        <div className="fixed inset-0 -z-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-secondary/20 via-transparent to-transparent" />
        </div>

        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <div className="relative z-10">
            {children}
          </div>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
