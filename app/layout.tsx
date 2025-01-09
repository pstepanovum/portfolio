import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Site URL for dynamic references
const SITE_URL = "https://pstepanov.work";
const SITE_NAME = "Pavel Stepanov";
const DEFAULT_DESCRIPTION = "Full Stack Developer, Machine Learning Engineer, and Cybersecurity Analyst with expertise in AI and modern web technologies.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
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
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  generator: "Next.js",
  applicationName: "Pavel Stepanov Portfolio",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    title: {
      default: `${SITE_NAME} - Full Stack Developer`,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Pavel Stepanov - Portfolio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Tech Portfolio`,
    description: "Full Stack Development | Machine Learning | AI | Cybersecurity",
    creator: "@yourtwitterhandle",
    images: [`${SITE_URL}/twitter-image.png`],
  },
  verification: {
    google: "your-google-site-verification",
    yandex: "your-yandex-verification",
  },
  appleWebApp: {
    title: "Pavel.",
    statusBarStyle: "default",
    startupImage: [
      '/apple-splash-2048-2732.png',
      '/apple-splash-1668-2224.png',
      '/apple-splash-1536-2048.png',
    ],
  },
  icons: {
    // Favicon Icons
    icon: [
      { url: '/favicon.ico', sizes: '64x64 32x32 24x24 16x16', type: 'image/x-icon' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    // Microsoft Tile
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#5bbad5'
      },
      {
        rel: 'msapplication-TileImage',
        url: '/mstile-150x150.png'
      }
    ],
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: SITE_URL,
    languages: {
      "en-US": SITE_URL,
    },
  },
  other: {
    "msapplication-TileColor": "#da532c",
    "msapplication-config": "/browserconfig.xml",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Pavel." />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        <meta name="msapplication-TileColor" content="#da532c" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}