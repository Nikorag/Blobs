import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // let phones on the local network load dev assets (otherwise the page never hydrates)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
