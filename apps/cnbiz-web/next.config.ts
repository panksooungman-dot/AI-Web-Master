import type { NextConfig } from "next";

// CNBIZ.KR is the brand/company site only — it no longer takes website-creation
// requests directly. /contact and /request (and their submission APIs/pages)
// were removed; both paths now redirect straight to the AI website-builder /
// consultation product instead of 404ing for anyone with an old link bookmarked.
const CNBIZ_AI_URL = process.env.NEXT_PUBLIC_CNBIZ_AI_URL || "https://cnbiz.ai.kr";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@cnbiz/design-system",
    "@cnbiz/dev-inspector",
    "@cnbiz/ui",
    "@cnbiz/layout-primitives",
    "@cnbiz/utils",
  ],
  async redirects() {
    return [
      { source: "/contact", destination: CNBIZ_AI_URL, permanent: true },
      { source: "/request", destination: CNBIZ_AI_URL, permanent: true },
    ];
  },
};

export default nextConfig;
