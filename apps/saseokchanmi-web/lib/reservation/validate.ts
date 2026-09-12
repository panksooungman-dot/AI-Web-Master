import type { FieldErrors, ReservationInput } from "./types";

const PHONE_PATTERN = /^[0-9-+\s]{8,20}$/;

/** 클라이언트와 서버 양쪽에서 동일하게 재사용하는 검증 규칙(기획서 11장). */
export function validateReservationInput(input: ReservationInput): FieldErrors {
  const errors: FieldErrors = {};

  if (!input.name.trim()) {
    errors.name = "이름을 입력해 주세요.";
  }

  if (!input.phone.trim()) {
    errors.phone = "연락처를 입력해 주세요.";
  } else if (!PHONE_PATTERN.test(input.phone.trim())) {
    errors.phone = "연락처 형식을 확인해 주세요.";
  }

  if (!input.visitDate.trim()) {
    errors.visitDate = "방문 희망일을 입력해 주세요.";
  }

  if (!input.visitTime.trim()) {
    errors.visitTime = "방문 희망 시간을 입력해 주세요.";
  }

  if (!input.partySize.trim()) {
    errors.partySize = "인원 수를 입력해 주세요.";
  } else if (!/^\d{1,3}$/.test(input.partySize.trim())) {
    errors.partySize = "인원 수는 숫자로 입력해 주세요.";
  }

  return errors;
}

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
