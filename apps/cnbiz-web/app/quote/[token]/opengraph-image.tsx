import { ImageResponse } from "next/og";
import { colors } from "@cnbiz/design-system";
import { getWebsiteOrderByShareToken } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface ImageParams {
  params: Promise<{ token: string }>;
}

/**
 * `/quote/[token]`(및 그 하위 페이지)에서 카카오톡·문자 링크 미리보기에 쓰이는 세그먼트 전용
 * OG 이미지 — layout.tsx의 generateMetadata()와 동일한 방식으로 토큰의 실제 고객사명을 조회해
 * 화면에 표시한다. 루트 `app/opengraph-image.tsx`와 같은 디자인 언어(다크 배경, CN/BIZ 로고
 * 조합)를 재사용하되, 고객사명이 있으면 그 회사 전용 문서임을 보여주는 두 번째 텍스트 블록을
 * 추가한다.
 */
export default async function Image({ params }: ImageParams) {
  const { token } = await params;
  const order = await getWebsiteOrderByShareToken(token);
  const client = order ? await getClient(order.clientId) : undefined;
  const companyName = client?.companyName || order?.name || null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: colors.secondary,
        }}
      >
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: "#ffffff" }}>
          CN<span style={{ color: colors.primaryLight }}>BIZ</span>
        </div>
        {companyName && (
          <div
            style={{
              display: "flex",
              marginTop: 40,
              padding: "20px 48px",
              borderRadius: 16,
              border: `2px solid ${colors.primaryLight}`,
              fontSize: 48,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {companyName} 프로젝트 문서
          </div>
        )}
        <div style={{ display: "flex", marginTop: 32, fontSize: 28, color: "#cbd5e1" }}>
          견적서 · 기능명세서 · 프로젝트 일정 · 계약서 · 제안서
        </div>
      </div>
    ),
    { ...size }
  );
}
