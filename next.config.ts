import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a fully static site into out/ for DigitalOcean App Platform.
  output: "export",
};

export default nextConfig;
