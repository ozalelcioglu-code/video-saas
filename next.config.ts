import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@remotion/bundler",
      "@remotion/renderer",
      "@remotion/vercel",
      "remotion",
    ],
  },
  outputFileTracingIncludes: {
    "/api/render": ["./remotion/**/*"],
  },
};

export default nextConfig;