import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["v9", "*.v9", "localhost", "127.0.0.1", "*.google.internal", "*.cloud.google.com"],
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
  async redirects() {
    return [
      {
        source: "/leader/:id",
        destination: "/order/:id/leader",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
