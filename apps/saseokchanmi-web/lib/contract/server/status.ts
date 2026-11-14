import type { ConfigRecord, SubmissionRecord } from "./store";

export type ContractStatus = "unsubmitted" | "awaiting_owner" | "confirmed";

export const STATUS_LABEL: Record<ContractStatus, string> = {
  unsubmitted: "미제출",
  awaiting_owner: "사업주 서명 대기",
  confirmed: "확정",
};

/** 제출 건의 사업주 서명 여부: 서명 시점 공통 서명이 있었거나, 관리자가 따로 서명했으면 true. */
export const isOwnerSigned = (s: SubmissionRecord): boolean => !!s.countersignedAt || !!s.configSnapshot.ownerSig;

export function contractStatus(_config: ConfigRecord, submission: SubmissionRecord | null): ContractStatus {
  if (!submission) return "unsubmitted";
  return isOwnerSigned(submission) ? "confirmed" : "awaiting_owner";
}
