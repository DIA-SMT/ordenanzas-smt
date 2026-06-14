import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth"],
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
