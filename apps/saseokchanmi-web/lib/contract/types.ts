/**
 * 근로계약서 도메인 타입 (요청서 4장). 서버와 클라이언트가 함께 쓰는 순수 타입이다.
 * 기준 구현은 `contract.html`의 DEF / TYPE_DEF 이며, 필드 이름을 그대로 유지한다.
 */

export type EmploymentType = "hourly" | "monthly" | "parttime";
export type SchedType = "work" | "off" | "week";
export type TermType = "open" | "fixed";
export type WageType = "시급" | "월급";
export type HolidayMode = "separate" | "none";
export type PayMethod = "" | "direct" | "bank";
export type InsKey = "emp" | "acc" | "pen" | "hlt";
export type InsFlag = "y" | "n";

/** 요일별 근무표 한 칸 (월~일 7개). */
export interface SchedDay {
  t: SchedType;
  s: string;
  e: string;
  bs: string;
  be: string;
}

export interface Allowance {
  n: string;
  a: string;
}

/** 공통 설정(company_settings): 모든 직원 계약서에 똑같이 들어가는 내용. */
export interface CompanySettings {
  biz: string;
  owner: string;
  tel: string;
  addr: string;
  /** 투명 PNG data URL. 서버에만 저장하고 클라이언트 번들·소스에 넣지 않는다. */
  ownerSig: string;
  watermark: boolean;
}

/** 직원 계약 설정(contract_config) + 공통 설정이 합쳐진, 계약서 렌더링용 전체 설정. */
export interface ContractConfig extends CompanySettings {
  type: EmploymentType;
  /** 관리자용 직원 이름(메모). 계약서에는 나오지 않는다. */
  label: string;
  /** 계약 작성일. ISO(YYYY-MM-DD) 또는 "2026년 12월 1일" 형태 모두 표시 가능. */
  date: string;
  termType: TermType;
  start: string;
  end: string;
  duty: string;
  workS: string;
  workE: string;
  brkS: string;
  brkE: string;
  brkNote: string;
  /** 매주 근무일 수(숫자 문자열). */
  days: string;
  weekRule: string;
  weekRule2: string;
  useSched: boolean;
  sched: SchedDay[];
  wageType: WageType;
  wage: string;
  holiday: HolidayMode;
  basePay: string;
  allow: Allowance[];
  bonus: "none" | "has";
  bonusAmt: string;
  other: "none" | "has";
  otherText: string;
  payDay: string;
  payMethod: PayMethod;
  ins: Record<InsKey, InsFlag>;
  insNote: string;
  extra: string;
}

/** 근로자가 입력하는 4대 사회보험 미적용 사유서 내용 (요청서 6장). */
export interface InsForm {
  /** 보험 키 → 사유 번호("1"~"4") */
  r: Partial<Record<InsKey, string>>;
  other: string;
  birth: string;
  detail: string;
  /** 확인 문구 3개 체크 여부 */
  c: boolean[];
}

/** 계약서 본문 렌더링에 필요한 근로자 쪽 데이터(제출 한 건). */
export interface ContractSubmissionView {
  name?: string;
  phone?: string;
  address?: string;
  /** 근로자 서명(투명 PNG data URL) */
  sig?: string;
  /** 사업주 개별 서명(공통 서명이 없을 때) */
  ownerSig?: string;
  signedAt?: string;
  countersignedAt?: string | null;
  insForm?: InsForm | null;
}
