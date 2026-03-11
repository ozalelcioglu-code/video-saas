/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    enabled: false,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    outputFileTracingIncludes: {
      "/api/render": ["./remotion-bundle/**/*"],
    },
  },
};

export default nextConfig;