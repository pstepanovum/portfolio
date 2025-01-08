import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    url: "https://pstepanov.dev",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}