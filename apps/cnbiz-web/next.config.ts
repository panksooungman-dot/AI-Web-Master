import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@cnbiz/design-system",
    "@cnbiz/ui",
    "@cnbiz/layout-primitives",
    "@cnbiz/utils",
  ],
};

export default nextConfig;
