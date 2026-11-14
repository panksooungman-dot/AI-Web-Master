import { CONTACT, SITE_NAME } from "@/lib/site-config";
import type { Allowance, CompanySettings, ContractConfig, EmploymentType, InsKey, SchedDay } from "./types";

export const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export const TYPE_NAME: Record<EmploymentType, string> = {
  hourly: "시급제",
  monthly: "월급제",
  parttime: "파트타임",
};

/** 4대 사회보험 키와 표시 이름. */
export const INSK: ReadonlyArray<readonly [InsKey, string]> = [
  ["emp", "고용보험"],
  ["acc", "산재보험"],
  ["pen", "국민연금"],
  ["hlt", "건강보험"],
];

/** 미적용 사유 선택지 (요청서 6장). 번호는 사유서에 그대로 표기된다. */
export const INS_REASON: Record<string, string> = {
  "1": "월 소정근로시간 60시간(주 15시간) 미만의 단시간근로자임",
  "2": "연령 요건에 따른 제외 대상임",
  "3": "다른 사업장 등에서 이미 가입되어 있어 중복 적용 대상이 아님",
  "4": "기타 법령상 제외 사유",
};

/** 근로자 확인 문구 3개. 모두 체크해야 제출할 수 있다. */
export const INS_CONFIRM: readonly string[] = [
  "위 내용은 사실과 다름이 없습니다.",
  "4대 사회보험 가입은 법령상 의무이며, 근로자의 희망이나 동의만으로는 미적용할 수 없고 법정 제외 사유가 있을 때만 미적용됨을 사업주로부터 설명 들었습니다.",
  "근로시간 증가, 연령 등 사정이 바뀌어 가입 요건에 해당하게 되면 즉시 사업주에게 알리고, 사업주가 가입 처리하는 데 동의합니다.",
];

/**
 * 최저시급 기본값(2026년 기준). 요청서 5-5: 상수로 분리해 바뀌면 쉽게 고칠 수 있게 한다.
 * 실제 운영에서는 관리자 공통 설정의 값을 우선 사용하고, 없을 때만 이 값을 쓴다.
 */
export const DEFAULT_MIN_WAGE = 10320;
export const MIN_WAGE_YEAR = 2026;

/**
 * 공통 설정 기본값. 전화번호는 사이트 설정(CONTACT.phone)을 그대로 따른다
 * — contract.html에 남아 있던 이전 번호(031-945-8804)는 2026-11-06에 정정된 오타였다.
 */
export const DEFAULT_COMPANY: CompanySettings = {
  biz: SITE_NAME,
  owner: "황명분",
  tel: CONTACT.phone,
  addr: "경기 파주시 광탄면 만장산로 363",
  ownerSig: "",
  watermark: true,
};

export const GLOBAL_KEYS = ["biz", "owner", "tel", "addr", "ownerSig", "watermark"] as const;

const workDay = (): SchedDay => ({ t: "work", s: "09:00", e: "18:00", bs: "14:00", be: "15:00" });

/** 요일별 근무표 기본값: 월~금 근무, 토 휴무, 일 주휴일. */
export const defaultSched = (): SchedDay[] => [
  workDay(),
  workDay(),
  workDay(),
  workDay(),
  workDay(),
  { t: "off", s: "", e: "", bs: "", be: "" },
  { t: "week", s: "", e: "", bs: "", be: "" },
];

/** 파트타임 기본: 7일 전부 휴무에서 시작. */
export const allOff = (): SchedDay[] => DAYS.map(() => ({ t: "off", s: "", e: "", bs: "", be: "" }));

const emptyAllow = (): Allowance[] => [
  { n: "", a: "" },
  { n: "", a: "" },
  { n: "", a: "" },
];

/**
 * 직원 계약 기본값 (contract.html의 DEF). 작성일·근로개시일은 직원마다 달라서 비워 둔다
 * (관리자 화면에서 달력으로 고른다).
 */
export const makeDefaultConfig = (): ContractConfig => ({
  ...DEFAULT_COMPANY,
  type: "hourly",
  label: "",
  date: "",
  termType: "open",
  start: "",
  end: "",
  duty: "홀, 주방보조",
  workS: "09:00",
  workE: "18:00",
  brkS: "14:00",
  brkE: "15:00",
  brkNote: "손님이 없을 때 추가 휴식 가능",
  days: "5",
  weekRule: "근무일 및 주휴일은 사업주가 작성하는 주간 근무표에 따름",
  weekRule2: "주휴일은 매주 1일 이상 부여하며, 근무표는 시행 7일 전까지 근로자에게 통보함",
  useSched: false,
  sched: defaultSched(),
  wageType: "시급",
  wage: "",
  holiday: "separate",
  basePay: "",
  allow: emptyAllow(),
  bonus: "none",
  bonusAmt: "",
  other: "none",
  otherText: "",
  payDay: "",
  payMethod: "",
  ins: { emp: "y", acc: "y", pen: "y", hlt: "y" },
  insNote: "",
  extra: "",
});

/** 고용형태별 기본값 (요청서 4-1). */
export const TYPE_DEF: Record<EmploymentType, Partial<ContractConfig>> = {
  hourly: { type: "hourly", wageType: "시급", useSched: false, holiday: "separate" },
  monthly: { type: "monthly", wageType: "월급", useSched: false, holiday: "none" },
  parttime: {
    type: "parttime",
    wageType: "시급",
    useSched: true,
    holiday: "separate",
    brkNote: "",
    weekRule: "",
    weekRule2: "",
  },
};

/**
 * 공통 설정(global)과 직원별 값(worker)을 합쳐 계약서 렌더링용 전체 설정을 만든다.
 * 우선순위: 기본값 < 고용형태 기본값 < 공통 설정 < 직원별 값.
 * 호출마다 새 객체를 돌려주므로 결과를 수정해도 기본값이 오염되지 않는다.
 */
export function buildConfig(
  global?: Partial<CompanySettings> | null,
  worker?: Partial<ContractConfig> | null,
): ContractConfig {
  const type: EmploymentType = worker?.type && worker.type in TYPE_DEF ? worker.type : "hourly";
  const g: Partial<CompanySettings> = {};
  if (global) {
    for (const k of GLOBAL_KEYS) {
      if (k in global) (g as Record<string, unknown>)[k] = global[k];
    }
  }
  const merged = { ...makeDefaultConfig(), ...structuredClone(TYPE_DEF[type]), ...g, ...(worker ?? {}) } as ContractConfig;
  // 파트타임인데 근무표가 없으면 전부 휴무에서 시작한다.
  if (merged.type === "parttime" && !(worker && Array.isArray(worker.sched))) merged.sched = allOff();
  return merged;
}
