import type { AIAnalysisResult } from "@/lib/ai-analysis/types";

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
  /** 챗봇 대화에서 AI가 정리한 요구사항 요약(=상담 내용). */
  requirements: string;
  budget?: string;
  /** 업종. AI Business OS Phase 1(고객 상담/설문 연동)에서 추가 — 기존 필드는 변경하지 않음. */
  industry?: string;
  /** 챗봇 설문 응답 원본(질문-답변 구조는 챗봇 쪽에서 자유롭게 확장 가능하도록 구조화하지 않음). */
  survey?: Record<string, unknown>;
  /** 상담 중 업로드된 첨부파일 URL 목록. */
  uploadedFiles?: string[];
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
  /**
   * AI Business OS Phase 2에서 추가 — lib/ai-analysis의 AI Analysis Engine 산출물.
   * Inquiry 생성 직후 자동으로 채워진다(POST /api/external/inquiries). null/undefined는
   * "아직 분석되지 않음"(예: Phase 2 이전에 생성된 Inquiry, 또는 분석 자체가 실패한 경우)을
   * 의미하며 파이프라인의 나머지 부분(Client/WebsiteOrder/AiJob)에는 영향을 주지 않는다.
   */
  analysis?: AIAnalysisResult | null;
  analyzedAt?: string | null;
}
