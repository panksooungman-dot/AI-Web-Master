import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cnbiz/ui", "@cnbiz/layout-primitives", "@cnbiz/utils"],
  images: {
    // 네이버 스마트플레이스 실제 고객 후기 사진(lib/content.ts의 CUSTOMER_REVIEWS)을 표시하기 위함.
    remotePatterns: [{ protocol: "https", hostname: "search.pstatic.net" }],
  },
};

export default nextConfig;
