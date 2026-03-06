import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler ile hiç uğraşma, kapalı kalsın
  reactCompiler: false,

  // Remotion + rspack native bağımlılıklarını bundle etme
  serverExternalPackages: [
    "remotion",
    "@remotion/renderer",
    "@remotion/bundler",
    "@rspack/core",
    "@rspack/binding-darwin-arm64",
    "@rspack/binding-darwin-x64",
  ],
};

export default nextConfig;