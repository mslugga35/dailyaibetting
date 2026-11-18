import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
