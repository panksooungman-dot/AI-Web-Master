import type { ProjectRequestInput } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9-+\s]{9,15}$/;

export type RequestValidationErrors = Partial<Record<keyof ProjectRequestInput, string>>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function parseRequestInput(body: unknown): ProjectRequestInput {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  return {
    companyName: asString(record.companyName).trim(),
    contactName: asString(record.contactName).trim(),
    email: asString(record.email).trim(),
    phone: asString(record.phone).trim(),
    industry: asString(record.industry).trim(),
    siteType: asString(record.siteType).trim(),
    features: asStringArray(record.features),
    referenceSites: asString(record.referenceSites).trim(),
    budget: asString(record.budget).trim(),
    message: asString(record.message).trim(),
  };
}

export function validateRequestInput(input: ProjectRequestInput): RequestValidationErrors {
  const errors: RequestValidationErrors = {};

  if (!input.companyName) errors.companyName = "회사명을 입력해주세요.";
  if (!input.contactName) errors.contactName = "담당자명을 입력해주세요.";

  if (!input.email) {
    errors.email = "이메일을 입력해주세요.";
  } else if (!EMAIL_PATTERN.test(input.email)) {
    errors.email = "올바른 이메일 형식이 아닙니다.";
  }

  if (!input.phone) {
    errors.phone = "연락처를 입력해주세요.";
  } else if (!PHONE_PATTERN.test(input.phone)) {
    errors.phone = "올바른 연락처 형식이 아닙니다.";
  }

  if (!input.industry) errors.industry = "업종을 선택해주세요.";
  if (!input.siteType) errors.siteType = "홈페이지 종류를 선택해주세요.";
  if (!input.message) errors.message = "요청사항을 입력해주세요.";

  return errors;
}
