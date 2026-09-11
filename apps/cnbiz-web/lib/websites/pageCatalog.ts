/**
 * "실제화면과 페이지 설명도 추가" (2026-09-11) — 의뢰자에게 실제 화면(Preview 배포)을 보여줄 때,
 * "이 화면이 무슨 역할인지" 문장을 곁들이기 위한 고정 페이지 목록. Website Builder(`packages/cli`)가
 * `siteType`과 무관하게 항상 동일한 11개 경로(Home/About/Services/Products/Pricing/FAQ/Blog/
 * Contact/Privacy/Terms/404)를 생성한다는 사실에 기반한다(`packages/cli/src/website/
 * design-content-enrichment.ts`의 `pageContentKeyForPath()`가 실제로 매핑하는 경로와 정확히
 * 일치 — 지어낸 목록이 아니라 실제 생성기가 만드는 경로 그대로다). 404는 의뢰자에게 보여줄
 * 실제 콘텐츠 페이지가 아니라 제외한다.
 */
export interface PreviewPageDescriptor {
  path: string;
  label: string;
  description: string;
}

export const PREVIEW_PAGE_CATALOG: PreviewPageDescriptor[] = [
  { path: "/", label: "홈", description: "첫 화면입니다. 핵심 메시지와 서비스 소개, 다른 페이지로 이동하는 진입점 역할을 합니다." },
  { path: "/about", label: "회사 소개", description: "회사·업체 소개, 비전과 가치를 전달하는 페이지입니다." },
  { path: "/services", label: "서비스 소개", description: "제공하는 서비스 종류와 특징을 설명하는 페이지입니다." },
  { path: "/products", label: "상품", description: "판매하는 상품·상품군을 소개하는 페이지입니다." },
  { path: "/pricing", label: "요금 안내", description: "가격·요금제 정보를 안내하는 페이지입니다." },
  { path: "/faq", label: "자주 묻는 질문", description: "고객이 자주 묻는 질문과 답변을 모아둔 페이지입니다." },
  { path: "/blog", label: "블로그", description: "소식·콘텐츠를 게시하는 페이지입니다." },
  { path: "/contact", label: "문의하기", description: "고객이 문의를 남기거나 연락처를 확인하는 페이지입니다." },
  { path: "/privacy", label: "개인정보처리방침", description: "개인정보 수집·이용에 대한 법적 안내 페이지입니다." },
  { path: "/terms", label: "이용약관", description: "서비스 이용 조건을 안내하는 법적 페이지입니다." },
];
