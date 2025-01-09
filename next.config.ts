import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/',
        has: [
          {
            type: 'header',
            key: 'content-type',
            value: 'application/x-www-form-urlencoded',
          },
        ],
      },
    ];
  }
};

export default nextConfig;