import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Baseline hardening (QA 2026-11-19 found none set). No CSP yet: inline scripts,
  // AdSense and Stripe redirects need a tested policy first.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Old /post/ URLs → /blog (recover link equity from Google-crawled pages)
      {
        source: '/post/:slug',
        destination: '/blog',
        permanent: true,
      },
      // Short paths Harbor blog posts link to; they never existed as pages.
      { source: '/ncaab-picks', destination: '/picks/ncaab', permanent: true },
      { source: '/consensus-picks', destination: '/consensus', permanent: true },
    ];
  },
};

export default nextConfig;
