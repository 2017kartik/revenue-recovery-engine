import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this directory so it doesn't
  // crawl up to the monorepo root and pick up the backend's .env file.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
