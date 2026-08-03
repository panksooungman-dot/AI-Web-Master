/**
 * 고객사의 웹사이트 제작 주문(Commercial Entity). AI Generate가 최초 성공하면
 * lib/aiJobs/worker.ts::triggerWorkspaceProvisioning()이 lib/projects(Development OS의
 * Workspace/Git 기반 "Project Manager")에 이 주문을 대표하는 ProjectRecord를 자동 등록하고
 * `projectId`에 그 id를 채운다 — 별도의 "Customer Project" Domain/Registry는 두지 않으며,
 * `ProjectRecord.websiteOrderId`(역방향 FK)가 존재하는지 여부만으로 "고객 프로젝트"를
 * 식별한다(`/projects` 목록·상세 화면의 "고객 프로젝트" 배지 참고).
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
  /**
   * Development OS Project Manager(lib/projects)에 자동 등록된 Project id. AI Generate가 최초
   * 성공했을 때 lib/aiJobs/worker.ts::triggerWorkspaceProvisioning()이 채운다. 이 필드가 이미
   * 있으면 재시도로 새 Website(outDir)가 생겨도 다시 등록하지 않는다(WebsiteOrderRecord 도입
   * 이후 추가된 옵셔널 필드 — 기존 레코드에는 없을 수 있음).
   */
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}
