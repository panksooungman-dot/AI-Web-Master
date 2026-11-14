import { calc } from "./calc";
import { safeImg, num } from "./format";
import { insOff } from "./render";
import type { ContractConfig, InsForm } from "./types";

/**
 * 입력 검증. 브라우저와 서버가 같은 함수를 써서 같은 규칙으로 판단한다
 * (요청서 8장: 서버에서 입력값을 다시 검증). 메시지는 contract.html과 같다.
 */

export interface WorkerInfoInput {
  name: string;
  phone: string;
  address: string;
}

export interface WorkerInfoErrors {
  name?: string;
  phone?: string;
  address?: string;
}

/** 근로자 1단계 입력: 성명 2자 이상, 전화번호 0으로 시작하는 9~11자리 숫자, 주소 6자 이상. */
export function validateWorkerInfo(i: WorkerInfoInput): { ok: boolean; errors: WorkerInfoErrors } {
  const errors: WorkerInfoErrors = {};
  if (String(i.name ?? "").trim().length < 2) errors.name = "이름을 입력해 주세요.";
  if (!/^0\d{8,10}$/.test(String(i.phone ?? "").replace(/\D/g, ""))) errors.phone = "전화번호를 정확히 입력해 주세요.";
  if (String(i.address ?? "").trim().length < 6) errors.address = "주소를 입력해 주세요. (시/구/동까지)";
  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * 사회보험 미적용 사유서 검증. 통과하면 빈 문자열, 아니면 첫 번째 오류 메시지.
 * 미적용 보험이 없으면 사유서가 필요 없으므로 항상 통과한다.
 */
export function validateInsForm(C: Pick<ContractConfig, "ins">, f: InsForm | null | undefined): string {
  const off = insOff(C);
  if (!off.length) return "";
  const form = f || { r: {}, other: "", birth: "", detail: "", c: [] };
  if (off.some((x) => !(form.r || {})[x[0]])) return "미적용 사유를 모두 선택해 주세요.";
  if (Object.values(form.r || {}).includes("4") && !(form.other || "").trim()) return "기타 사유를 적어 주세요.";
  if (String(form.birth || "").replace(/\D/g, "").length < 6) return "생년월일을 입력해 주세요.";
  if ((form.detail || "").trim().length < 2) return "구체적 내용을 적어 주세요.";
  if (!(form.c || []).length || !form.c.every(Boolean) || form.c.length < 3) return "확인 사항에 모두 체크해 주세요.";
  return "";
}

/** 서명 이미지: `data:image/png;base64,...` 이면서 크기 제한 이내. */
export const isValidSignature = (u: unknown): boolean => safeImg(u) !== "";

export interface ConfigCheck {
  /** 저장을 막는 오류 */
  errors: string[];
  /** 저장은 가능하지만 관리자에게 보여 줄 경고 */
  warnings: string[];
}

/**
 * 직원 계약 저장 시 검증 (요청서 4-1).
 * 필수: 직원 이름, 임금(월급제는 기본급), 근무 요일 1일 이상.
 * 임금지급일·지급방법은 협의 전이면 비워 두고 저장할 수 있지만 경고를 낸다.
 */
export function checkConfig(C: ContractConfig): ConfigCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!String(C.label ?? "").trim()) errors.push("직원 이름(메모)을 입력해 주세요.");
  if (C.type === "monthly" ? !num(C.basePay) : !num(C.wage)) errors.push("임금을 입력해 주세요. 협의가 끝난 뒤 만드세요.");
  if (calc(C).days < 1) errors.push("근무하는 요일을 정해 주세요.");
  const missing = [!C.payDay && "임금지급일", !C.payMethod && "지급방법"].filter(Boolean) as string[];
  if (missing.length) warnings.push("아직 " + missing.join("·") + "이(가) 비어 있습니다. 협의한 뒤 채워서 직원에게 링크를 보내 주세요.");
  return { errors, warnings };
}
