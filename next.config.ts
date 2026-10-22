import type { NextConfig } from "next";
import { execSync } from "child_process";

let gitCommit = "dev";
let gitCommitDate = "";
try {
  gitCommit = execSync("git rev-parse --short HEAD").toString().trim();
  gitCommitDate = execSync('git log -1 --format="%cd" --date=format:"%d %b %H:%M"').toString().trim();
} catch {
  // fallback if git is unavailable
}

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
    NEXT_PUBLIC_BUILD_TIME: gitCommitDate || new Date().toISOString(),
  },
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
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|png|webp|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
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
