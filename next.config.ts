import type { NextConfig } from "next";

const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOST;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/shop",
        destination: "/mens-watch",
        permanent: true,
      },
      {
        source: "/watch-accessories",
        destination: "/womens-watch",
        permanent: true,
      },
      {
        source: "/our-stores",
        destination: "/european-grade",
        permanent: true,
      },
      {
        source: "/contact",
        destination: "/swiss-grade",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      ...(mediaHost
        ? [{ protocol: "https" as const, hostname: mediaHost }]
        : []),
    ],
  },
};

export default nextConfig;
