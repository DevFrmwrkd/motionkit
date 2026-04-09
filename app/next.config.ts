import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": [
      "node_modules/@swc/helpers/**/*",
      "node_modules/next/dist/**/*",
    ],
  },
};

export default nextConfig;
