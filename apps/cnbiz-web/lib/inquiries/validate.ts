import type { InquiryInput, InquirySource } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9-+\s]{9,15}$/;
const VALID_SOURCES: InquirySource[] = ["chatbot", "manual"];

export type InquiryValidationErrors = Partial<Record<keyof InquiryInput, string>>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asSource(value: unknown): InquirySource {
  return VALID_SOURCES.includes(value as InquirySource) ? (value as InquirySource) : "chatbot";
}

function asOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return strings.length > 0 ? strings : undefined;
}

function asOptionalCodeSnippets(value: unknown): { filename: string; content: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const snippets = value
    .filter(
      (item): item is { filename: unknown; content: unknown } => typeof item === "object" && item !== null,
    )
    .map((item) => ({
      filename: asString((item as Record<string, unknown>).filename).trim(),
      content: asString((item as Record<string, unknown>).content),
    }))
    .filter((item) => item.filename && item.content);
  return snippets.length > 0 ? snippets : undefined;
}

/** 여러 후보 키 중 처음으로 값이 있는 것을 사용한다(필드명이 다른 호출자와의 호환용). */
function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = asString(record[key]).trim();
    if (value) return value;
  }
  return "";
}

export function parseInquiryInput(body: unknown): InquiryInput {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  return {
    source: asSource(record.source),
    externalConversationId: asString(record.externalConversationId).trim() || undefined,
    companyName: pickString(record, ["companyName"]),
    // customerName: AI Business OS Phase 1 스펙의 필드명 — 기존 contactName과 동일한 의미.
    contactName: pickString(record, ["contactName", "customerName"]),
    email: pickString(record, ["email"]),
    phone: pickString(record, ["phone"]),
    siteType: pickString(record, ["siteType"]),
    // consultation: AI Business OS Phase 1 스펙의 필드명 — 기존 requirements와 동일한 의미.
    requirements: pickString(record, ["requirements", "consultation"]),
    budget: pickString(record, ["budget"]) || undefined,
    industry: pickString(record, ["industry"]) || undefined,
    survey: asOptionalRecord(record.survey),
    uploadedFiles: asOptionalStringArray(record.uploadedFiles),
    referenceUrls: asOptionalStringArray(record.referenceUrls),
    codeSnippets: asOptionalCodeSnippets(record.codeSnippets),
    rawPayload: asOptionalRecord(record.rawPayload),
  };
}

/**
 * 챗봇 대화는 사람이 채우는 /request 폼(lib/requests/validate.ts)보다 수집 가능한 정보가
 * 적을 수 있다(예: 대화 초반이라 회사명·연락처를 아직 못 물어봤을 수 있음) — 그래서
 * companyName/phone/siteType은 필수로 두지 않는다. 담당자명·이메일·요구사항 요약만 있으면
 * Inquiry/Client/WebsiteOrder 파이프라인을 시작할 수 있다.
 */
export function validateInquiryInput(input: InquiryInput): InquiryValidationErrors {
  const errors: InquiryValidationErrors = {};

  if (!input.contactName) errors.contactName = "담당자명이 필요합니다.";

  if (!input.email) {
    errors.email = "이메일이 필요합니다.";
  } else if (!EMAIL_PATTERN.test(input.email)) {
    errors.email = "올바른 이메일 형식이 아닙니다.";
  }

  if (input.phone && !PHONE_PATTERN.test(input.phone)) {
    errors.phone = "올바른 연락처 형식이 아닙니다.";
  }

  // app/developer/inquiries/new/page.tsx의 클라이언트 검증은 "문의 내용 또는 첨부파일 중
  // 하나는 필수"라고 이미 안내하고 있었는데, 이 함수는 requirements를 무조건 요구해 파일만
  // 첨부하고 제출하면 서버에서 다시 막히는 불일치가 있었다(2026-09-12 실사용 리포트) —
  // generateAnalysis()(lib/ai-analysis/analysis.ts)는 requirements가 비어 있어도 첨부
  // 이미지·코드 파일로 분석을 이어가도록 이미 폴백 문구를 갖추고 있어, 첨부가 있으면
  // requirements 없이도 안전하게 파이프라인을 시작할 수 있다.
  const hasAttachment = (input.uploadedFiles?.length ?? 0) > 0 || (input.codeSnippets?.length ?? 0) > 0;
  if (!input.requirements && !hasAttachment) {
    errors.requirements = "문의 내용 또는 첨부파일 중 하나는 필수입니다.";
  }

  return errors;
}
