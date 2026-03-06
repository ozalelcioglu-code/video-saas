import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@remotion/renderer",
    "@remotion/vercel",
    "remotion"
  ],
  outputFileTracingIncludes: {
    "/api/render": ["./public/remotion-bundle/**/*"]
  }
};

export default nextConfig;