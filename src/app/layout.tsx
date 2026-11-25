import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Saira_Condensed } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WebsiteJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";
import { ProPopup } from "@/components/monetization/ProPopup";
import { SubscriptionProvider } from "@/lib/context/subscription-context";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { CONSENT_DEFAULTS_SCRIPT } from "@/lib/ads/consent-defaults";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Athletic condensed display face — sharp sportsbook headline voice,
// consistent with the wider betting-property family.
const sairaCondensed = Saira_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  // Absolute URLs for per-page opengraph-image files (without this, Next resolved them
  // against localhost and link previews on social apps were broken).
  metadataBase: new URL('https://dailyaibetting.com'),
  title: {
    default: "DailyAI Betting - Free Sports Betting Picks & Expert Consensus",
    template: "%s | DailyAI Betting",
  },
  description:
    "Free daily sports betting picks with consensus from multiple expert cappers. Get NFL picks, NBA picks, MLB picks, NHL picks today. Find fire picks where 3+ experts agree. Picks update throughout the day.",
  keywords: [
    "free sports betting picks",
    "AI betting predictions",
    "consensus picks today",
    "consensus bets today",
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
    "daily consensus picks",
    "AI sports predictions",
  ],
  authors: [{ name: "DailyAI Betting" }],
  creator: "DailyAI Betting",
  publisher: "DailyAI Betting",
  // No site-wide canonical/og:url: inherited by every page without its own, they told
  // search engines that /pricing, /results etc. duplicate the homepage. The homepage sets its own.
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "DailyAI Betting",
    title: "DailyAI Betting - Free Sports Betting Picks Today",
    description: "Free daily consensus picks from multiple expert cappers. NFL, NBA, MLB, NHL picks updated throughout the day.",
    images: [
      {
        url: "https://dailyaibetting.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: "DailyAI Betting - Free Sports Picks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@dailyaibetting",
    creator: "@dailyaibetting",
    title: "DailyAI Betting - Free Sports Picks Today",
    description: "Free daily consensus picks from expert cappers. Updated throughout the day.",
    images: ["https://dailyaibetting.com/opengraph-image"],
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
    // Google Search Console verification
    // Service account: picks-exporter-bot@free-picks-exporter.iam.gserviceaccount.com
    // Site already verified - add verification code here if needed for HTML tag method
    // google: "your-verification-code-here",
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
        {/* Must stay first: Google consent defaults (non-personalized ads; no Google cookies in EEA/UK/CH) */}
        <script id="google-consent-defaults" dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULTS_SCRIPT }} />
        <WebsiteJsonLd />
        <FAQJsonLd />
        <GoogleAnalytics />
        {/* HarborSEO — AI-optimised titles, descriptions, and schema */}
        <script
          src="https://outgoing-oyster-428.convex.site/api/harbor-seo.js?siteId=nd70pb9sd9fpewcxsyk028at0n8368ee"
          data-harbor-site="nd70pb9sd9fpewcxsyk028at0n8368ee"
          async
        />
        {/* Google AdSense */}
        <Script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4971966903803570" crossOrigin="anonymous" strategy="lazyOnload" />
        {/* Impact.com Verification */}
        <meta name="impact-site-verification" content="27678012-a389-4e37-a055-37d59ed4ebf1" />
        {/* WebMCP - exposes consensus lookup to an agent in the visitor's browser.
            Inert until this origin serves a valid origin-trial token. */}
        <script src="/webmcp.js" defer></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sairaCondensed.variable} antialiased min-h-screen flex flex-col`}
      >
        <SubscriptionProvider>
          <Header />
          <main className="flex-1">
            <div className="container px-4 pt-4">
              <Breadcrumbs />
            </div>
            {children}
          </main>
          <Footer />
          <ProPopup />
        </SubscriptionProvider>
      </body>
    </html>
  );
}
