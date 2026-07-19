/**
 * 고객사의 웹사이트 제작 주문(Commercial Entity). 이름이 비슷한 lib/projects(내부
 * Development OS의 Workspace/Git 기반 "Project Manager")와는 완전히 다른 엔티티이며,
 * 혼동을 피하기 위해 "Project"라는 단어를 아예 쓰지 않는다 — lib/projects·/api/projects·
 * /projects UI는 계속 내부 개발 워크스페이스 전용으로 남는다.
 *
 * 상태 전이는 주문 처리 흐름을 그대로 따른다: 접수(Requested) → 처리 중(InProgress) →
 * 검수(Review) → 납품 완료(Delivered) 또는 취소(Cancelled).
 */
export type WebsiteOrderStatus = "Requested" | "InProgress" | "Review" | "Delivered" | "Cancelled";

export const WEBSITE_ORDER_STATUSES: WebsiteOrderStatus[] = [
  "Requested",
  "InProgress",
  "Review",
  "Delivered",
  "Cancelled",
];

export interface WebsiteOrderInput {
  clientId: string;
  inquiryId: string;
  name: string;
  siteType: string;
  requirements: string;
  budget?: string;
}

export interface WebsiteOrderRecord extends WebsiteOrderInput {
  id: string;
  status: WebsiteOrderStatus;
  aiJobIds: string[];
  /** 이 주문을 처리하며 생성된 Website 산출물(lib/websites) id들 — AI Job이 성공할 때마다 추가. */
  websiteIds: string[];
  createdAt: string;
  updatedAt: string;
}
