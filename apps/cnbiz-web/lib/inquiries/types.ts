/**
 * 챗봇(cnbiz.ai.kr)에서 넘어온 최초 접수 레코드. 사람이 직접 채우는 /request 폼의
 * ProjectRequestRecord(lib/requests)와 필드가 비슷해 보이지만 출처(source)가 다르고,
 * Client/WebsiteOrder로 연결되는 파이프라인의 시작점이라는 점에서 별도 컬렉션으로 둔다.
 */
export type InquirySource = "chatbot" | "manual";

export type InquiryStatus = "New" | "Qualified" | "Converted" | "Rejected";

export const INQUIRY_STATUSES: InquiryStatus[] = ["New", "Qualified", "Converted", "Rejected"];

export interface InquiryInput {
  source: InquirySource;
  /** 챗봇 세션/대화 스레드 ID. 중복 접수 추적·디버깅용, 필수는 아님. */
  externalConversationId?: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  siteType: string;
  /** 챗봇 대화에서 AI가 정리한 요구사항 요약. */
  requirements: string;
  budget?: string;
  /** 챗봇이 보낸 원본 페이로드 전체(감사/디버깅용, 그대로 보관). */
  rawPayload?: Record<string, unknown>;
}

export interface InquiryRecord extends InquiryInput {
  id: string;
  status: InquiryStatus;
  /** Converted 이전에는 null — findOrCreateClientByEmail/createWebsiteOrder 실행 후 채워짐. */
  clientId: string | null;
  websiteOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}
