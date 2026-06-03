import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No static export — we need SSR for auth middleware
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
