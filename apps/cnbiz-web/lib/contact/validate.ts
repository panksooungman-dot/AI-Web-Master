import type { ContactSubmissionInput } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9-+\s]{9,15}$/;

export type ContactValidationErrors = Partial<Record<keyof ContactSubmissionInput, string>>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseContactInput(body: unknown): ContactSubmissionInput {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  return {
    name: asString(record.name).trim(),
    phone: asString(record.phone).trim(),
    email: asString(record.email).trim(),
    message: asString(record.message).trim(),
  };
}

export function validateContactInput(input: ContactSubmissionInput): ContactValidationErrors {
  const errors: ContactValidationErrors = {};

  if (!input.name) errors.name = "이름을 입력해주세요.";
  if (!input.phone) {
    errors.phone = "연락처를 입력해주세요.";
  } else if (!PHONE_PATTERN.test(input.phone)) {
    errors.phone = "올바른 연락처 형식이 아닙니다.";
  }
  if (!input.email) {
    errors.email = "이메일을 입력해주세요.";
  } else if (!EMAIL_PATTERN.test(input.email)) {
    errors.email = "올바른 이메일 형식이 아닙니다.";
  }
  if (!input.message) errors.message = "문의 내용을 입력해주세요.";

  return errors;
}
