import type { Metadata } from "next";
import { getWebsiteOrderByShareToken } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

interface LayoutParams {
  params: Promise<{ token: string }>;
}

/**
 * `/quote/[token]`(및 그 하위 견적서·기능명세서·프로젝트 일정·계약서·제안서 페이지)는 전부
 * "use client" 페이지라 그 파일 안에서는 `metadata`/`generateMetadata`를 내보낼 수 없다
 * (Next.js는 Server Component에서만 허용) — 그래서 부모 세그먼트인 이 layout.tsx(Server
 * Component)에 둔다. 하위 5개 페이지 전부 이 metadata를 그대로 물려받는다.
 *
 * 2026-09-13 — 카카오톡 등에 이 링크를 붙여넣으면 지금까지는 루트 레이아웃의 기본
 * OG(og:title="CNBIZ - 디지털 혁신 파트너", 홈페이지 og:image)가 그대로 노출되어 "무슨
 * 링크인지" 전혀 알 수 없었다("CNBIZ - 디지털 혁신 파트너" 카드만 뜨는 문제, 사용자가 실제
 * 카카오톡 캡처로 확인). 토큰으로 실제 고객사명을 조회해 그 회사 전용 타이틀·설명·OG
 * 이미지(../opengraph-image.tsx)를 보여주도록 개선했다. `openGraph.images`는 일부러
 * 지정하지 않는다 — 지정하면 이 세그먼트의 opengraph-image.tsx 파일 컨벤션보다 우선해
 * 버려 루트의 기본 이미지로 되돌아간다.
 */
export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { token } = await params;

  const order = await getWebsiteOrderByShareToken(token);
  const client = order ? await getClient(order.clientId) : undefined;
  const companyName = client?.companyName || order?.name || null;

  const title = companyName ? `${companyName} 프로젝트 문서` : "프로젝트 문서";
  const description = companyName
    ? `${SITE_NAME}가 준비한 ${companyName}의 프로젝트 문서(견적서·기능명세서·프로젝트 일정 등)를 로그인 없이 확인하실 수 있습니다.`
    : `${SITE_NAME}가 준비한 프로젝트 문서를 로그인 없이 확인하실 수 있습니다.`;
  const url = `${SITE_URL}/quote/${token}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "website",
      title,
      description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function QuoteTokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
