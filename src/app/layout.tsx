import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
    default: "DailyAI Betting - AI-Powered Sports Betting Picks & Consensus",
    template: "%s | DailyAI Betting",
  },
  description:
    "Get daily AI-analyzed sports betting picks with consensus from top cappers. Track performance, find value bets, and make smarter betting decisions with real-time AI insights.",
  keywords: [
    "sports betting picks",
    "AI betting predictions",
    "consensus picks",
    "MLB picks",
    "NFL picks",
    "NBA picks",
    "capper rankings",
    "betting analytics",
  ],
  authors: [{ name: "DailyAI Betting" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://dailyaibetting.com",
    siteName: "DailyAI Betting",
    title: "DailyAI Betting - AI-Powered Sports Betting Picks",
    description: "Daily AI-analyzed consensus picks from top sports cappers.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DailyAI Betting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DailyAI Betting - AI Sports Picks",
    description: "Daily AI-analyzed consensus picks from top sports cappers.",
    images: ["/og-image.png"],
  },
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
