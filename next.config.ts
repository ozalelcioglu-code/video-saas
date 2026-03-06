import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "remotion",
  ],
  outputFileTracingIncludes: {
    "/api/render": ["./remotion/**/*"],
  },
};

export default nextConfig;