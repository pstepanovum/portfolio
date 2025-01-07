// app/layout.tsx
import { Inter } from 'next/font/google'
import { Metadata, Viewport } from "next"
import PageTransitionProvider from '@/components/page-transition-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import "./globals.css"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: "Pavel Stepanov",
    template: "%s | Pavel Stepanov",
  },
  description:
    "Full Stack Developer, Machine Learning Engineer, and Cybersecurity Analyst with expertise in AI and modern web technologies.",
  keywords: [
    "Pavel Stepanov",
    "Full Stack Developer",
    "Machine Learning",
    "Artificial Intelligence",
    "Cybersecurity",
    "Web Development",
    "Software Engineer",
    "AI Developer",
    "Security Analyst",
  ],
  creator: "Pavel Stepanov",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://pstepanov.dev", // Replace with your actual domain
    title: "Pavel Stepanov - Full Stack Developer",
    description:
      "Specializing in Full Stack Development, Machine Learning, AI, and Cybersecurity",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pavel Stepanov - Tech Portfolio",
    description:
      "Full Stack Development | Machine Learning | AI | Cybersecurity",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light" // Support both schemes
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-b from-background to-background/80 font-realtime-regular antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
        <ThemeProvider>
          <PageTransitionProvider>
            <div className="relative flex min-h-screen flex-col">
              <main className="relative flex-1 flex flex-col z-10">
                {children}
              </main>
            </div>
          </PageTransitionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}