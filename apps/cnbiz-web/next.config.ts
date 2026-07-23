import type { NextConfig } from "next";

// CNBIZ.KR no longer takes AI website-builder requests directly — /request (and its submission
// API/page) redirects to the external consultation product instead of 404ing for anyone with an
// old link bookmarked.
//
// AI Business OS Rewiring (Phase 1): /contact used to redirect here too, on the premise that
// cnbiz.ai.kr's chatbot was the only real intake path (see REWIRING_REPORT.md — that premise was
// never confirmed and CHATBOT_API_KEY was never even configured in Production). /contact is now a
// real page on cnbiz.kr again (app/contact/page.tsx) that posts straight to the internal
// POST /api/inquiries, so it's intentionally no longer in the redirect list below.
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
    return [{ source: "/request", destination: CNBIZ_AI_URL, permanent: true }];
  },
};

export default nextConfig;
