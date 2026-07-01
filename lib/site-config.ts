// 실제 도메인 확정 전 임시 값 (REQUEST.md 13. 도메인 및 호스팅 — 미정)
export const SITE_URL = "https://cnbiz.co.kr";
export const SITE_NAME = "CNBIZ";
export const SITE_TITLE = "CNBIZ - 디지털 혁신 파트너";
export const SITE_DESCRIPTION =
  "CNBIZ는 기업의 디지털 전환을 이끄는 IT 전문 기업입니다. 디지털 전환 컨설팅, AI/ML 솔루션, 엔터프라이즈 개발, 클라우드 인프라 서비스를 제공합니다.";

// Next.js는 하위 라우트에서 openGraph를 재정의하면 상위 값(siteName·locale·images)을
// 이어받지 않으므로, 각 페이지 metadata에서 이 값을 함께 전개(spread)해 사용한다.
export const OG_DEFAULTS = {
  siteName: SITE_NAME,
  locale: "ko_KR",
  type: "website" as const,
  images: ["/opengraph-image"],
};
