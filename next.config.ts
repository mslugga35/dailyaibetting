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
    ];
  },
};

export default nextConfig;
