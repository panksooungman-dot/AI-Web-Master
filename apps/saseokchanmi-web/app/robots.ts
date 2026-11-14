import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 관리자 화면, 근로자 계약서 링크(토큰), API는 검색엔진에 노출하지 않는다.
      disallow: ["/admin", "/contract", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
