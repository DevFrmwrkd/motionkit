import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../"),
  webpack(config) {
    config.resolve.alias["@convex"] = path.join(__dirname, "../convex");
    return config;
  },
  outputFileTracingIncludes: {
    "/*": [
      "node_modules/@swc/helpers/**/*",
      "node_modules/next/dist/**/*",
    ],
  },
  // Don't let Cloudflare's edge cache HTML pages — auth pages especially
  // need to always re-render. Static JS/CSS bundles are content-hashed and
  // remain immutable, so they cache safely without this header.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
