import type { ClientInput } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9-+\s]{9,15}$/;

export type ClientUpdateInput = Partial<ClientInput>;
export type ClientUpdateErrors = Partial<Record<keyof ClientInput, string>>;

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

/** PATCH 본문에서 실제로 보낸 필드만 골라낸다 — 보내지 않은 필드는 기존 값을 유지한다. */
export function parseClientUpdateInput(body: unknown): ClientUpdateInput {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const input: ClientUpdateInput = {};

  const companyName = asOptionalString(record.companyName);
  const contactName = asOptionalString(record.contactName);
  const email = asOptionalString(record.email);
  const phone = asOptionalString(record.phone);

  if (companyName !== undefined) input.companyName = companyName;
  if (contactName !== undefined) input.contactName = contactName;
  if (email !== undefined) input.email = email;
  if (phone !== undefined) input.phone = phone;

  return input;
}

/** 값을 보낸 필드에 한해서만 검증한다 — 부분 수정이라 나머지 필드는 건드리지 않는다. */
export function validateClientUpdateInput(input: ClientUpdateInput): ClientUpdateErrors {
  const errors: ClientUpdateErrors = {};

  if (input.companyName !== undefined && !input.companyName) {
    errors.companyName = "회사명을 입력하세요.";
  }
  if (input.contactName !== undefined && !input.contactName) {
    errors.contactName = "담당자명을 입력하세요.";
  }
  if (input.email !== undefined) {
    if (!input.email) {
      errors.email = "이메일을 입력하세요.";
    } else if (!EMAIL_PATTERN.test(input.email)) {
      errors.email = "올바른 이메일 형식이 아닙니다.";
    }
  }
  if (input.phone !== undefined && input.phone && !PHONE_PATTERN.test(input.phone)) {
    errors.phone = "올바른 연락처 형식이 아닙니다.";
  }

  return errors;
}
