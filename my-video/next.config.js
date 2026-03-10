const BUILD_DIR = require("./build-dir.mjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingIncludes: {
    "/api/render": [
      "./" + BUILD_DIR + "/**/*",
      "./render.ts",
      "./ensure-browser.ts",
    ],
  },
};

export default nextConfig;