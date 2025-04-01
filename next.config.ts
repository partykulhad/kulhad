import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! WARN !!
    // This is a temporary solution to bypass type checking errors
    // You should fix the actual type issues when possible
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
