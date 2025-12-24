import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WebsiteJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";
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
    default: "DailyAI Betting - Free AI Sports Betting Picks & Expert Consensus",
    template: "%s | DailyAI Betting",
  },
  description:
    "Free daily AI-powered sports betting picks with consensus from 10+ expert cappers. Get NFL picks, NBA picks, MLB picks, NHL picks today. Find fire picks where 3+ experts agree. Updated every 5 minutes.",
  keywords: [
    "free sports betting picks",
    "AI betting predictions",
    "consensus picks today",
    "best bets today",
    "free NFL picks",
    "free NBA picks",
    "free MLB picks",
    "free NHL picks",
    "expert sports picks",
    "capper consensus",
    "betting analytics",
    "fire picks",
    "parlay picks",
    "sports betting tips",
    "daily best bets",
    "AI sports predictions",
  ],
  authors: [{ name: "DailyAI Betting" }],
  creator: "DailyAI Betting",
  publisher: "DailyAI Betting",
  alternates: {
    canonical: "https://dailyaibetting.com",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://dailyaibetting.com",
    siteName: "DailyAI Betting",
    title: "DailyAI Betting - Free AI Sports Betting Picks Today",
    description: "Free daily AI-analyzed consensus picks from 10+ expert cappers. NFL, NBA, MLB, NHL picks updated every 5 minutes.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DailyAI Betting - Free AI Sports Picks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@dailyaibetting",
    creator: "@dailyaibetting",
    title: "DailyAI Betting - Free AI Sports Picks Today",
    description: "Free daily AI-analyzed consensus picks from expert cappers. Updated every 5 minutes.",
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
  verification: {
    // Add these when you have them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  category: "Sports Betting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <WebsiteJsonLd />
        <FAQJsonLd />
      </head>
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
