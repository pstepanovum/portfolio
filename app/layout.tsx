import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  display: "swap",
});

// Site URL for dynamic references
const SITE_URL = "https://pstepanov.dev";
const SITE_NAME = "Pavel Stepanov";
const DEFAULT_DESCRIPTION =
  "Full Stack Developer, Machine Learning Engineer, and Cybersecurity Analyst with expertise in AI and modern web technologies.";

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
    description:
      "Full Stack Development | Machine Learning | AI | Cybersecurity",
    creator: "@yourtwitterhandle",
    images: [`${SITE_URL}/twitter-image.png`],
  },
  verification: {
    google: "your-google-site-verification",
    yandex: "your-yandex-verification",
  },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: SITE_URL,
    languages: {
      "en-US": SITE_URL,
    },
  },
  other: {
    "msapplication-TileColor": "#000000",
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
      <body
        className={`${ibmPlexMono.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
