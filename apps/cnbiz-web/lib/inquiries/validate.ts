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
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

export function parseInquiryInput(body: unknown): InquiryInput {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  return {
    source: asSource(record.source),
    externalConversationId: asString(record.externalConversationId).trim() || undefined,
    companyName: asString(record.companyName).trim(),
    contactName: asString(record.contactName).trim(),
    email: asString(record.email).trim(),
    phone: asString(record.phone).trim(),
    siteType: asString(record.siteType).trim(),
    requirements: asString(record.requirements).trim(),
    budget: asString(record.budget).trim() || undefined,
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

  if (!input.requirements) errors.requirements = "요구사항 요약이 필요합니다.";

  return errors;
}
