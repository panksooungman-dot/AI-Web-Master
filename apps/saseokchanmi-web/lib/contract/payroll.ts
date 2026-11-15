import { calc, schedOf } from "./calc";
import { csvCell } from "./clock-summary";
import { buildSheet, fmtMin, kst, monthLabel, monthRange, pairShifts, type SheetConfig, type SheetEvent } from "./clock-sheet";
import { esc, nh, num, won } from "./format";
import type { ContractConfig } from "./types";

/**
 * 급여 계산·급여명세서 (순수 함수, 서버·클라이언트 공용).
 * 출퇴근 기록과 계약서 내용(시급·월급·고정수당·주휴수당·4대보험 적용 여부)으로 한 달 급여를 계산한다.
 *
 * 범위(사업주 확인): 상시 근로자 5인 미만 사업장이라 연장·야간·휴일 가산수당은 계산하지 않는다.
 * 공제율은 사업주가 설정한 값만 쓴다(코드에 요율을 넣지 않는다). 모든 금액은 명세서에서 직접 조정할 수 있다.
 * 이 계산은 사업주가 급여를 정리하는 데 쓰는 도구이며, 확정 급여는 노무사·급여 프로그램으로 확인해야 한다.
 */

export type PayrollConfig = SheetConfig & Pick<ContractConfig, "holiday" | "basePay" | "allow" | "ins" | "payDay">;

/** 사업주가 설정하는 공제율(%). 0이면 그 항목은 계산하지 않는다. */
export interface PayrollRates {
  /** 국민연금 근로자 부담률(%) */
  pension: number;
  /** 건강보험 근로자 부담률(%) */
  health: number;
  /** 장기요양보험료율: 건강보험료 대비 %. */
  ltc: number;
  /** 고용보험 근로자 부담률(%) */
  employment: number;
  /** 지방소득세: 소득세 대비 %. */
  localTax: number;
}

export const emptyRates = (): PayrollRates => ({ pension: 0, health: 0, ltc: 0, employment: 0, localTax: 10 });

export type OverrideKey = "pension" | "health" | "ltc" | "employment" | "incomeTax" | "localTax";

export interface MoneyLine {
  label: string;
  amount: number;
}

/** 명세서를 만들 때 사업주가 직접 넣는 값. */
export interface PayrollInput {
  /** 임금 지급일 YYYY-MM-DD (모르면 빈 문자열) */
  payDate: string;
  /** 계약 외에 더해 줄 금액(식대 보전, 정정 등). */
  extraEarnings: MoneyLine[];
  extraDeductions: MoneyLine[];
  /** 공단 고지 금액 등으로 자동 계산값을 바꾸고 싶을 때. incomeTax는 자동 계산이 없어 여기에 직접 넣는다. */
  override: Partial<Record<OverrideKey, number>>;
  /** 퇴근 기록 누락 등 경고를 확인했다는 표시. 경고가 있으면 확정하려면 필요하다. */
  ack: boolean;
}

export const emptyInput = (): PayrollInput => ({ payDate: "", extraEarnings: [], extraDeductions: [], override: {}, ack: false });

export interface PayLine {
  key: string;
  label: string;
  amount: number;
  /** 계산 방법(명세서에 그대로 표시) */
  basis: string;
}

export interface PayStatement {
  month: string;
  earnings: PayLine[];
  deductions: PayLine[];
  gross: number;
  deductionTotal: number;
  net: number;
  work: { workedMin: number; workedDays: number; scheduledMin: number | null; deductBreak: boolean };
  /** 확정 전에 확인이 필요한 문제(퇴근 기록 누락 등). 있으면 확인 표시(ack) 없이 확정할 수 없다. */
  blocking: string[];
  /** 확인 표시로도 넘길 수 없는 오류(공제 합계가 총지급액보다 큼 등). 있으면 확정할 수 없다. */
  errors: string[];
  /** 알아 두면 좋은 안내. */
  notes: string[];
}

const DAY_MS = 86_400_000;
const p2 = (n: number) => String(n).padStart(2, "0");
const floor10 = (n: number) => Math.max(0, Math.floor(n / 10) * 10);
const pct = (n: number) => `${Math.round(n * 1000) / 1000}%`;

/** 급여 계산에 쓸 기록 조회 기간: 달 시작 8일 전(월경계 주의 주휴 판단)부터 달 끝까지. */
export function payrollWindow(month: string): { from: string; to: string } {
  const r = monthRange(month);
  return { from: new Date(Date.parse(r.from) - 8 * DAY_MS).toISOString(), to: new Date(Date.parse(r.to) + 2 * DAY_MS).toISOString() };
}

const addDays = (date: string, n: number): string => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

interface HolidayResult {
  amount: number;
  paid: number;
  total: number;
  weekHours: number;
  missed: string[];
}

/**
 * 주휴수당: 주(월~일)의 일요일이 이 달 안에 있는 주마다 판단한다.
 * 조건: 1주 소정근로시간 15시간 이상 + 그 주의 소정근로일(근로 개시일 이후)에 모두 출근.
 * 금액 = 시급 × (1주 소정근로시간 ÷ 40, 최대 1) × 8시간.
 */
function holidayPay(config: PayrollConfig, events: SheetEvent[], month: string, wage: number): HolidayResult | null {
  if (!config.useSched) return null;
  const weekHours = calc(config).weekMin / 60;
  if (weekHours < 15) return { amount: 0, paid: 0, total: 0, weekHours, missed: [] };
  const sched = schedOf(config);
  const hasStart = /^\d{4}-\d{2}-\d{2}$/.test(config.start);
  const attended = new Set(pairShifts(events).shifts.map((s) => kst(s.inEv.at).date));
  const perWeek = Math.round(wage * (Math.min(weekHours, 40) / 40) * 8);
  const { days } = monthRange(month);
  let paid = 0;
  let total = 0;
  const missed: string[] = [];
  for (let d = 1; d <= days; d++) {
    const date = `${month}-${p2(d)}`;
    if (kst(`${date}T12:00:00+09:00`).dow !== 6) continue; // 일요일만
    const scheduled: string[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(date, i - 6);
      if (sched[i].t === "work" && (!hasStart || day >= config.start)) scheduled.push(day);
    }
    if (scheduled.length === 0) continue;
    total++;
    if (scheduled.every((day) => attended.has(day))) paid++;
    else missed.push(`${date.slice(5).replace("-", "/")} 주간`);
  }
  return { amount: paid * perWeek, paid, total, weekHours, missed };
}

export interface ComputeArgs {
  month: string;
  events: SheetEvent[];
  config: PayrollConfig;
  deductBreak: boolean;
  minWage: number;
  rates: PayrollRates;
  input: PayrollInput;
}

export function computePayroll(a: ComputeArgs): PayStatement {
  const { month, config, input, rates } = a;
  const sheet = buildSheet({ month, events: a.events, config, deductBreak: a.deductBreak });
  const earnings: PayLine[] = [];
  const notes: string[] = [];
  const blocking: string[] = [];
  const errors: string[] = [];

  if (sheet.totals.openCount) blocking.push(`퇴근 기록이 없는 근무가 ${sheet.totals.openCount}건 있습니다(그 근무는 근무시간 0으로 계산됩니다).`);
  if (sheet.totals.strayCount) blocking.push(`출근 기록이 없는 퇴근이 ${sheet.totals.strayCount}건 있습니다.`);

  const monthly = config.wageType === "월급";
  if (monthly) {
    const base = num(config.basePay);
    if (base) earnings.push({ key: "base", label: "기본급", amount: base, basis: "계약서의 월 기본급" });
    for (const al of Array.isArray(config.allow) ? config.allow : []) {
      const amt = num(al?.a);
      if (al?.n && amt) earnings.push({ key: `allow:${al.n}`, label: String(al.n).slice(0, 20), amount: amt, basis: "계약서의 고정수당" });
    }
    notes.push("월급제: 근무 기록과 관계없이 계약서의 월급을 지급하는 것으로 계산했습니다. 월급에는 주휴수당이 포함되어 있습니다.");
    notes.push("계약서에 상여금이 있거나 결근·중도 입퇴사로 일할 계산이 필요하면 '기타 지급·공제'에 직접 넣어 주세요.");
    if (/^\d{4}-\d{2}-\d{2}$/.test(config.start) && config.start.slice(0, 7) === month && config.start > `${month}-01`) {
      notes.push(`근로 개시일(${config.start})이 이 달 중간입니다. 월급을 일할 계산해야 하는지 확인하세요.`);
    }
    if (!earnings.length) notes.push("계약서에 월 기본급이 입력되어 있지 않습니다.");
  } else {
    const wage = num(config.wage);
    const worked = sheet.totals.workedMin;
    if (!wage) notes.push("계약서에 시급이 입력되어 있지 않습니다.");
    else if (a.minWage && wage < a.minWage) notes.push(`기본시급 ${won(wage)}이 설정된 최저시급 ${won(a.minWage)}보다 낮습니다.`);
    earnings.push({
      key: "base",
      label: "기본급(시급제)",
      amount: Math.round((worked / 60) * wage),
      basis: `시급 ${won(wage)} × 실제 근무 ${fmtMin(worked)}${a.deductBreak ? "(약정 휴게시간 차감)" : ""}`,
    });
    if (config.holiday === "separate" && wage) {
      const h = holidayPay(config, a.events, month, wage);
      if (!h) notes.push("계약서에 요일별 근무표가 없어 주휴수당을 자동 계산하지 못했습니다. 지급 대상이면 '기타 지급·공제'에 직접 넣어 주세요.");
      else if (h.weekHours < 15) notes.push(`1주 소정근로시간이 ${nh(h.weekHours)}시간(15시간 미만)이라 주휴수당 대상이 아닙니다.`);
      else {
        earnings.push({
          key: "holiday",
          label: "주휴수당",
          amount: h.amount,
          basis: `시급 ${won(wage)} × 주휴시간 ${nh((Math.min(h.weekHours, 40) / 40) * 8)}시간 × ${h.paid}주 (1주 소정근로시간 ${nh(h.weekHours)}시간 기준, 이 달 대상 ${h.total}주 중 개근 ${h.paid}주)`,
        });
        if (h.missed.length) notes.push(`소정근로일에 출근하지 않아 주휴수당을 제외한 주: ${h.missed.join(", ")}`);
        notes.push("주휴수당은 일요일이 이 달에 있는 주(월~일)를 기준으로 계산했습니다. 근로 개시 첫 주는 개시일 이후의 소정근로일로 판단합니다.");
      }
    } else if (config.holiday === "none") {
      notes.push("계약서에서 주휴수당을 별도로 지급하지 않는 것으로 되어 있어 계산하지 않았습니다.");
    }
  }

  input.extraEarnings.forEach((x, i) => x.amount > 0 && earnings.push({ key: `extra-e${i}`, label: x.label || "기타 지급", amount: x.amount, basis: "사업주 입력" }));
  const gross = earnings.reduce((t, l) => t + l.amount, 0);

  const deductions: PayLine[] = [];
  const ov = input.override;
  const pick = (key: OverrideKey, auto: number): number => (typeof ov[key] === "number" ? (ov[key] as number) : auto);
  const unset: string[] = [];
  const insure = (key: OverrideKey, label: string, rate: number, applies: boolean, base: number, baseLabel: string): number => {
    if (!applies && typeof ov[key] !== "number") return 0;
    if (rate <= 0 && typeof ov[key] !== "number") {
      unset.push(label);
      return 0;
    }
    const auto = floor10((base * rate) / 100);
    const amount = pick(key, auto);
    if (amount > 0) deductions.push({ key, label, amount, basis: typeof ov[key] === "number" ? "사업주가 직접 입력한 금액" : `${baseLabel} ${won(base)} × ${pct(rate)} (10원 미만 절사)` });
    return amount;
  };
  const insFlag = (k: "pen" | "hlt" | "emp") => config.ins?.[k] !== "n";
  insure("pension", "국민연금", rates.pension, insFlag("pen"), gross, "총지급액");
  const health = insure("health", "건강보험", rates.health, insFlag("hlt"), gross, "총지급액");
  insure("ltc", "장기요양보험", rates.ltc, insFlag("hlt"), health, "건강보험료");
  insure("employment", "고용보험", rates.employment, insFlag("emp"), gross, "총지급액");
  if (unset.length) notes.push(`공제율이 설정되지 않아 계산하지 않은 항목: ${unset.join(", ")}. 해당되면 공제율을 설정하거나 직접 입력하세요.`);
  const offIns = (["pen", "hlt", "emp"] as const).filter((k) => !insFlag(k)).map((k) => ({ pen: "국민연금", hlt: "건강보험", emp: "고용보험" })[k]);
  if (offIns.length) notes.push(`계약서에서 미적용으로 표시된 보험: ${offIns.join(", ")} (공제하지 않음)`);

  const tax = pick("incomeTax", 0);
  if (tax > 0) deductions.push({ key: "incomeTax", label: "소득세", amount: tax, basis: "사업주가 직접 입력한 금액" });
  const localAuto = floor10((tax * rates.localTax) / 100);
  const local = pick("localTax", tax > 0 ? localAuto : 0);
  if (local > 0) deductions.push({ key: "localTax", label: "지방소득세", amount: local, basis: typeof ov.localTax === "number" ? "사업주가 직접 입력한 금액" : `소득세 ${won(tax)} × ${pct(rates.localTax)} (10원 미만 절사)` });
  input.extraDeductions.forEach((x, i) => x.amount > 0 && deductions.push({ key: `extra-d${i}`, label: x.label || "기타 공제", amount: x.amount, basis: "사업주 입력" }));

  const deductionTotal = deductions.reduce((t, l) => t + l.amount, 0);
  if (deductionTotal > gross) errors.push("공제 합계가 총지급액보다 큽니다. 입력한 금액을 확인하세요.");
  return {
    month,
    earnings,
    deductions,
    gross,
    deductionTotal,
    net: gross - deductionTotal,
    work: { workedMin: sheet.totals.workedMin, workedDays: sheet.totals.workedDays, scheduledMin: sheet.totals.scheduledMin, deductBreak: a.deductBreak },
    blocking,
    errors,
    notes,
  };
}

/** 확정 가능한지: 오류가 없고, 경고(blocking)가 있으면 확인 표시가 있어야 한다. */
export const canConfirm = (s: PayStatement, input: PayrollInput): boolean => s.errors.length === 0 && (s.blocking.length === 0 || input.ack);

const th = "border:1px solid #999;background:#eee;padding:4px 6px;font-weight:700;text-align:center";
const td = "border:1px solid #999;padding:4px 6px";

export interface PayslipMeta {
  biz: string;
  owner: string;
  name: string;
  /** 근로 개시일(YYYY-MM-DD)이나 관리번호 등 근로자를 특정하는 정보 */
  employeeNo: string;
  payDate: string;
  revision?: number;
  confirmedAt?: string;
}

const dateKo = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(0, 4)}년 ${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일` : "");

/** 임금명세서(PDF·이미지·미리보기용 HTML). 사용자 입력은 모두 esc를 거친다. 근로기준법 제48조 기재사항을 포함한다. */
export function payslipHTML(s: PayStatement, m: PayslipMeta): string {
  const rows = (lines: PayLine[], empty: string) =>
    lines.length
      ? lines.map((l) => `<tr><td style="${td}">${esc(l.label)}</td><td style="${td};text-align:right">${esc(won(l.amount))}</td><td style="${td};font-size:10px;line-height:1.35">${esc(l.basis)}</td></tr>`).join("")
      : `<tr><td style="${td};text-align:center;color:#777" colspan="3">${esc(empty)}</td></tr>`;
  const head = (a: string) => `<tr><th style="${th};width:26%">${a}</th><th style="${th};width:22%">금액</th><th style="${th}">계산 방법</th></tr>`;
  const sum = (label: string, v: number, bold = false) => `<tr><td style="${td};background:#f6f6f6;font-weight:700">${label}</td><td style="${td};background:#f6f6f6;text-align:right;${bold ? "font-weight:700;font-size:1.1em" : "font-weight:700"}">${esc(won(v))}</td><td style="${td};background:#f6f6f6"></td></tr>`;
  const scheduled = s.work.scheduledMin == null ? "" : ` / 약정 ${esc(fmtMin(s.work.scheduledMin))}`;
  return (
    `<p class="ct" style="font-size:1.55em;letter-spacing:.3em;margin:0 0 8px">임 금 명 세 서</p>` +
    `<table style="width:100%;border-collapse:collapse;margin:4px 0 8px;font-size:11.5px"><tbody>` +
    `<tr><td style="${td};background:#eee;width:17%;font-weight:700">사업장</td><td style="${td}">${esc(m.biz)}${m.owner ? ` (대표 ${esc(m.owner)})` : ""}</td><td style="${td};background:#eee;width:17%;font-weight:700">귀속 기간</td><td style="${td}">${esc(monthLabel(s.month))}</td></tr>` +
    `<tr><td style="${td};background:#eee;font-weight:700">성명</td><td style="${td}">${esc(m.name)}</td><td style="${td};background:#eee;font-weight:700">임금 지급일</td><td style="${td}">${esc(dateKo(m.payDate) || "")}</td></tr>` +
    `<tr><td style="${td};background:#eee;font-weight:700">식별 정보</td><td style="${td}" colspan="3">${esc(m.employeeNo)}</td></tr>` +
    `</tbody></table>` +
    `<table style="width:100%;border-collapse:collapse;margin:4px 0;font-size:11.5px"><thead>${head("지급 항목")}</thead><tbody>${rows(s.earnings, "지급 항목이 없습니다.")}${sum("임금 총액(총지급액)", s.gross)}</tbody></table>` +
    `<table style="width:100%;border-collapse:collapse;margin:8px 0 4px;font-size:11.5px"><thead>${head("공제 항목")}</thead><tbody>${rows(s.deductions, "공제 항목이 없습니다.")}${sum("공제 총액", s.deductionTotal)}</tbody></table>` +
    `<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px"><tbody><tr><td style="${td};background:#eee;font-weight:700;width:26%">실수령액</td><td style="${td};text-align:right;font-weight:700;font-size:1.2em;width:22%">${esc(won(s.net))}</td><td style="${td};font-size:10px">임금 총액 − 공제 총액</td></tr></tbody></table>` +
    `<p style="margin:4px 0;font-size:11px"><b>근무 내역</b> : 근무일 ${s.work.workedDays}일 / 실제 근무 ${esc(fmtMin(s.work.workedMin))}${scheduled}. 연장·야간·휴일 근로에 대한 가산수당은 상시 근로자 5인 미만 사업장으로 해당 없습니다.</p>` +
    `<p style="margin:6px 0 0;font-size:10px;color:#555;line-height:1.45">※ 근무시간은 출퇴근 기록(서버 시각, 한국 시간) 기준이며 ${s.work.deductBreak ? "약정 휴게시간을 차감했습니다" : "휴게시간을 차감하지 않았습니다"}. 4대 보험·세금 공제는 사업주가 설정한 비율 또는 입력한 금액입니다. 이 명세서는 근로기준법 제48조에 따라 임금 지급 시 교부합니다.${m.revision && m.revision > 1 ? ` (정정 발행 ${m.revision}차)` : ""}</p>` +
    `<div class="ln" style="padding-left:0;margin-top:12px"><b>사업주</b>&nbsp;(서명)&nbsp;＿＿＿＿＿＿＿ &nbsp;&nbsp;&nbsp; <b>근로자 수령 확인</b>&nbsp;(서명)&nbsp;＿＿＿＿＿＿＿</div>`
  );
}

/** 확정된 명세서들을 급여대장 CSV로. 엑셀에서 한글이 깨지지 않게 하려면 저장할 때 파일 맨 앞에 BOM(﻿)을 붙인다. */
export function payrollCsv(list: { name: string; month: string; payDate: string; revision: number; statement: PayStatement }[]): string {
  const E = (s: PayStatement, pred: (k: string) => boolean) => s.earnings.filter((l) => pred(l.key)).reduce((t, l) => t + l.amount, 0);
  const D = (s: PayStatement, pred: (k: string) => boolean) => s.deductions.filter((l) => pred(l.key)).reduce((t, l) => t + l.amount, 0);
  const header = ["직원", "귀속 월", "지급일", "확정 차수", "기본급·고정수당", "주휴수당", "기타 지급", "총지급액", "국민연금", "건강보험", "장기요양보험", "고용보험", "소득세", "지방소득세", "기타 공제", "공제 총액", "실수령액"];
  const rows = list.map((r) => {
    const s = r.statement;
    return [
      r.name,
      r.month,
      r.payDate,
      r.revision,
      E(s, (k) => k === "base" || k.startsWith("allow:")),
      E(s, (k) => k === "holiday"),
      E(s, (k) => k.startsWith("extra-e")),
      s.gross,
      D(s, (k) => k === "pension"),
      D(s, (k) => k === "health"),
      D(s, (k) => k === "ltc"),
      D(s, (k) => k === "employment"),
      D(s, (k) => k === "incomeTax"),
      D(s, (k) => k === "localTax"),
      D(s, (k) => k.startsWith("extra-d")),
      s.deductionTotal,
      s.net,
    ];
  });
  const total = ["합계", "", "", "", ...[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((i) => rows.reduce((t, r) => t + (r[i] as number), 0))];
  return [header, ...rows, ...(rows.length ? [total] : [])].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
