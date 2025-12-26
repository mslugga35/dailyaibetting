import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force www → non-www redirect for canonical URLs
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.dailyaibetting.com',
          },
        ],
        destination: 'https://dailyaibetting.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
