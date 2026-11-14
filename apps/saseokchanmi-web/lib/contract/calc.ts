import { DAYS, DEFAULT_MIN_WAGE, MIN_WAGE_YEAR, makeDefaultConfig } from "./defaults";
import { nh, num, tm, won } from "./format";
import type { ContractConfig, SchedDay } from "./types";

/** 하루 근로시간(분) = (퇴근 − 출근) − (휴게 끝 − 휴게 시작). 자정을 넘기면 다음 날로 계산한다. */
export function dayMin(s: string, e: string, bs: string, be: string): number {
  const a = tm(s);
  const b = tm(e);
  if (a == null || b == null) return 0;
  let w = b - a;
  if (w < 0) w += 1440;
  const c = tm(bs);
  const d = tm(be);
  if (c != null && d != null && d > c) w -= d - c;
  return Math.max(0, w);
}

export const schedOf = (C: Pick<ContractConfig, "sched">): SchedDay[] =>
  Array.isArray(C.sched) && C.sched.length === 7 ? C.sched : makeDefaultConfig().sched;

export interface CalcResult {
  /** 하루 평균 소정근로시간(분) */
  perDay: number;
  /** 1주 소정근로시간(분) */
  weekMin: number;
  /** 매주 근무일 수 */
  days: number;
  workDays: string[];
  weekOff: string[];
}

type CalcInput = Pick<ContractConfig, "useSched" | "sched" | "workS" | "workE" | "brkS" | "brkE" | "days">;

/** 근로시간 계산 (요청서 5-2). useSched면 요일별 근무표를 합산한다. */
export function calc(C: CalcInput): CalcResult {
  if (C.useSched) {
    let wk = 0;
    let n = 0;
    const workDays: string[] = [];
    const weekOff: string[] = [];
    schedOf(C).forEach((x, i) => {
      if (x.t === "work") {
        n++;
        wk += dayMin(x.s, x.e, x.bs, x.be);
        workDays.push(DAYS[i]);
      } else if (x.t === "week") {
        weekOff.push(DAYS[i]);
      }
    });
    return { perDay: n ? wk / n : 0, weekMin: wk, days: n, workDays, weekOff };
  }
  const d = dayMin(C.workS, C.workE, C.brkS, C.brkE);
  const n = Math.max(0, parseInt(C.days, 10) || 0);
  return { perDay: d, weekMin: d * n, days: n, workDays: [], weekOff: [] };
}

/**
 * 주휴수당 표기 줄 (요청서 5-3). 시급제·파트타임 + 주휴수당 별도 표기 + 시급 입력 +
 * 1주 소정근로시간 15시간 이상일 때만 만든다. 그 외에는 빈 배열.
 */
export function holidayLine(C: ContractConfig): string[] {
  if (C.wageType !== "시급" || C.holiday !== "separate" || !num(C.wage)) return [];
  const k = calc(C);
  const wh = k.weekMin / 60;
  if (wh < 15) return [];
  const w = num(C.wage);
  const hrs = (Math.min(wh, 40) / 40) * 8;
  const pay = Math.round(w * hrs);
  const per = Math.round(pay / wh);
  return [
    "- 기본시급 : " + won(w),
    "- 주휴시간 : 1주 " + nh(hrs) + "시간 (1주 소정근로시간 " + nh(wh) + "시간 기준)",
    "- 주휴수당 총액 : 1주 " + won(pay) + " (= 기본시급 " + won(w) + " × 주휴시간 " + nh(hrs) + "시간)",
    "- 주휴수당 시간당 환산액 : " + won(per) + " (= 주휴수당 총액 " + won(pay) + " ÷ 1주 소정근로시간 " + nh(wh) + "시간)",
    "- (참고) 기본시급과 주휴수당 환산액을 합한 시간당 금액 : " + won(w + per),
    "- 주휴수당은 기본시급과 별도로 지급하며, 주 소정근로시간이 15시간 이상이고 소정근로일을 개근한 경우에 지급함",
  ];
}

/** 월급 합계 = 기본급 + 고정수당. */
export const monthlyTotal = (C: Pick<ContractConfig, "basePay" | "allow">): number =>
  num(C.basePay) + (Array.isArray(C.allow) ? C.allow.reduce((t, x) => t + num(x && x.a), 0) : 0);

/** 월 소정근로시간(주휴시간 포함) = round((주시간 + 주휴시간) × 4.345). 주 40시간이면 209. */
export function monthHours(C: CalcInput): number {
  const wh = calc(C).weekMin / 60;
  const hol = wh >= 15 ? (Math.min(wh, 40) / 40) * 8 : 0;
  return Math.round((wh + hol) * 4.345);
}

/** 계약서 6번 첫 줄에 들어가는 임금 문구. 금액이 없으면 빈칸 표시를 쓴다. */
export function wageStr(C: ContractConfig): string {
  if (C.wageType === "월급") {
    const t = monthlyTotal(C);
    return "월급 " + (t ? won(t) : "＿＿＿＿＿원");
  }
  const w = num(C.wage);
  return "시급 " + (w ? won(w) : "＿＿＿＿＿원");
}

export interface WageCalcRow {
  label: string;
  value: string;
  note?: string;
}

export interface WageCalcSummary {
  /** false면 rows 대신 message를 보여준다. */
  ready: boolean;
  message?: string;
  rows: WageCalcRow[];
  /** 최저시급 미달 경고 */
  warning?: string;
  footnote?: string;
}

/**
 * 관리자용 "임금 계산" 패널 데이터 (요청서 5-5). 참고용이며 계약서에는 들어가지 않는다.
 * 최저시급은 인자로 받는다(공통 설정 값 → 없으면 DEFAULT_MIN_WAGE).
 */
export function wageCalcSummary(C: ContractConfig, minWage: number = DEFAULT_MIN_WAGE): WageCalcSummary {
  const K = calc(C);
  const wh = K.weekMin / 60;
  if (!(wh > 0)) return { ready: false, message: "근무 요일과 시간을 정하면 계산됩니다.", rows: [] };

  const footnote =
    "월 환산액은 참고용 계산이며, 실제 급여는 근무일수와 개근 여부에 따라 달라집니다. 최저시급 " +
    won(minWage) +
    "은 " +
    MIN_WAGE_YEAR +
    "년 기준으로, 변경되면 확인이 필요합니다.";

  if (C.wageType === "월급") {
    const t = monthlyTotal(C);
    const mh = monthHours(C);
    if (!t) return { ready: false, message: "월 기본급을 입력하면 계산됩니다.", rows: [] };
    const hr = Math.round(t / mh);
    return {
      ready: true,
      rows: [
        { label: "월급 합계", value: won(t), note: "기본급 " + won(num(C.basePay)) + " + 고정수당" },
        { label: "월 소정근로시간", value: mh + "시간", note: "주 " + nh(wh) + "시간 + 주휴시간 기준" },
        { label: "환산 시급", value: won(hr), note: "= 월급 합계 ÷ 월 소정근로시간" },
      ],
      warning: hr < minWage ? "환산 시급이 최저시급(" + won(minWage) + ")보다 낮습니다. 금액을 다시 확인하세요." : undefined,
      footnote,
    };
  }

  const w = num(C.wage);
  if (!w) return { ready: false, message: "시급을 입력하면 계산됩니다.", rows: [] };
  const hol = wh >= 15 ? Math.round((w * Math.min(wh, 40)) / 40 * 8) : 0;
  const base = Math.round(w * wh);
  const wk = base + hol;
  return {
    ready: true,
    rows: [
      { label: "1주 소정근로시간", value: nh(wh) + "시간", note: "주 " + K.days + "일" },
      { label: "1주 기본급", value: won(base), note: won(w) + " × " + nh(wh) + "시간" },
      hol ? { label: "1주 주휴수당", value: won(hol), note: "개근 시 지급" } : { label: "1주 주휴수당", value: "없음", note: "주 15시간 미만" },
      { label: "1주 합계", value: won(wk) },
      { label: "월 환산 예상액", value: won(Math.round(wk * 4.345)), note: "1주 합계 × 4.345주 (참고용)" },
    ],
    warning: w < minWage ? "시급이 최저시급(" + won(minWage) + ")보다 낮습니다. 금액을 다시 확인하세요." : undefined,
    footnote,
  };
}
