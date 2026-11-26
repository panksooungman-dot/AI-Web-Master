import { computePayroll, canConfirm, emptyInput, emptyRates, payrollWindow, type MoneyLine, type OverrideKey, type PayrollConfig, type PayrollInput, type PayrollRates, type PayStatement } from "../payroll";
import { isMonth, toKstLocal } from "../clock-sheet";
import { loadSettings, newId } from "./service";
import { statutoryRatesFor } from "../statutory-rates";
import { isOwnerSigned } from "./status";
import type { ContractConfig } from "../types";
import type { ClockEventRecord, ContractStore, PayrollSettingsRecord, PayslipRecord, SubmissionRecord } from "./store";

/**
 * 급여 (서버 전용). 출퇴근 기록과 계약서로 급여를 계산하고, 사업주가 확인한 명세서를 확정해 저장한다.
 * 확정할 때는 클라이언트가 보낸 금액을 믿지 않고 서버가 같은 계산을 다시 해서 저장한다.
 */

export type PayrollResult = { status: number; body: Record<string, unknown> };

const OVERRIDE_KEYS: readonly OverrideKey[] = ["pension", "health", "ltc", "employment", "incomeTax", "localTax"];
const MAX_MONEY = 1_000_000_000;
const MAX_LINES = 10;

export const defaultPayrollSettings = (): PayrollSettingsRecord => ({ rates: emptyRates(), autoRates: true, deductBreak: true, updatedAt: "" });

/** 이 달 급여 계산에 쓰는 공제율. 자동 적용이 켜져 있고 그 해의 법정 요율이 있으면 그것을, 아니면 사업주가 입력한 값을 쓴다. */
export function effectiveRates(p: PayrollSettingsRecord, month: string): { rates: PayrollRates; auto: boolean } {
  const st = p.autoRates === false ? null : statutoryRatesFor(month);
  return st ? { rates: st, auto: true } : { rates: p.rates, auto: false };
}

export async function loadPayrollSettings(store: ContractStore): Promise<PayrollSettingsRecord> {
  const s = await store.getPayrollSettings();
  return s ? { ...defaultPayrollSettings(), ...s, rates: { ...emptyRates(), ...s.rates } } : defaultPayrollSettings();
}

const isRate = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** 공제율 설정 검증. 보낸 값만 바꾼다. */
export function parsePayrollSettings(body: unknown, cur: PayrollSettingsRecord): { ok: true; value: Pick<PayrollSettingsRecord, "rates" | "deductBreak"> & { autoRates: boolean } } | { ok: false; error: string } {
  const b = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const rates: PayrollRates = { ...cur.rates };
  const given = typeof b.rates === "object" && b.rates !== null ? (b.rates as Record<string, unknown>) : {};
  for (const k of Object.keys(rates) as (keyof PayrollRates)[]) {
    if (given[k] === undefined) continue;
    if (!isRate(given[k])) return { ok: false, error: "공제율은 0 이상 100 이하의 숫자여야 합니다." };
    rates[k] = round3(given[k] as number);
  }
  if (b.deductBreak !== undefined && typeof b.deductBreak !== "boolean") return { ok: false, error: "휴게시간 차감 설정이 올바르지 않습니다." };
  if (b.autoRates !== undefined && typeof b.autoRates !== "boolean") return { ok: false, error: "법정 요율 자동 적용 설정이 올바르지 않습니다." };
  return { ok: true, value: { rates, autoRates: typeof b.autoRates === "boolean" ? b.autoRates : cur.autoRates !== false, deductBreak: typeof b.deductBreak === "boolean" ? b.deductBreak : cur.deductBreak } };
}

const money = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_MONEY ? v : null);

function lines(v: unknown, what: string): { ok: true; value: MoneyLine[] } | { ok: false; error: string } {
  if (v === undefined) return { ok: true, value: [] };
  if (!Array.isArray(v) || v.length > MAX_LINES) return { ok: false, error: `${what}은 ${MAX_LINES}개까지 입력할 수 있습니다.` };
  const out: MoneyLine[] = [];
  for (const x of v) {
    const o = typeof x === "object" && x !== null ? (x as Record<string, unknown>) : {};
    const amount = money(o.amount);
    if (amount === null) return { ok: false, error: `${what}의 금액은 0 이상의 정수(원)여야 합니다.` };
    if (amount === 0) continue;
    out.push({ label: String(o.label ?? "").trim().slice(0, 30), amount });
  }
  return { ok: true, value: out };
}

const isDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

/** 명세서 입력값 검증·정리. 모르는 항목은 버린다. */
export function parsePayrollInput(body: unknown): { ok: true; value: PayrollInput } | { ok: false; error: string } {
  const b = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const e = lines(b.extraEarnings, "기타 지급");
  if (!e.ok) return e;
  const d = lines(b.extraDeductions, "기타 공제");
  if (!d.ok) return d;
  const override: Partial<Record<OverrideKey, number>> = {};
  if (b.override !== undefined) {
    if (typeof b.override !== "object" || b.override === null) return { ok: false, error: "직접 입력 금액이 올바르지 않습니다." };
    for (const k of OVERRIDE_KEYS) {
      const v = (b.override as Record<string, unknown>)[k];
      if (v === undefined || v === null || v === "") continue;
      const m = money(v);
      if (m === null) return { ok: false, error: "직접 입력한 공제 금액은 0 이상의 정수(원)여야 합니다." };
      override[k] = m;
    }
  }
  const payDate = typeof b.payDate === "string" ? b.payDate.trim() : "";
  if (payDate && !isDate(payDate)) return { ok: false, error: "임금 지급일 형식이 올바르지 않습니다." };
  return { ok: true, value: { payDate, extraEarnings: e.value, extraDeductions: d.value, override, ack: b.ack === true } };
}

/** 계약서에서 급여 계산에 필요한 항목만 추린다(서명·연락처·주소는 내보내지 않는다). */
export function payrollConfigOf(c: ContractConfig): PayrollConfig {
  return {
    type: c.type, wageType: c.wageType, wage: c.wage, start: c.start, useSched: c.useSched, sched: c.sched,
    workS: c.workS, workE: c.workE, brkS: c.brkS, brkE: c.brkE, days: c.days,
    holiday: c.holiday, basePay: c.basePay, allow: c.allow, ins: c.ins, payDay: c.payDay,
  };
}

const p2 = (n: number) => String(n).padStart(2, "0");
const confirmedSubs = (subs: SubmissionRecord[]) => subs.filter(isOwnerSigned);
const nowMonth = (now: Date) => toKstLocal(now.toISOString()).slice(0, 7);

/** 계약서의 급여일(매월 N일)로 만든 기본 지급일: 귀속 월의 다음 달 N일. */
export function defaultPayDate(month: string, payDay: string): string {
  const day = Number(String(payDay).replace(/\D/g, ""));
  if (!day || day < 1 || day > 28) return "";
  const [y, m] = month.split("-").map(Number);
  return `${m === 12 ? y + 1 : y}-${p2(m === 12 ? 1 : m + 1)}-${p2(day)}`;
}

const employeeNoOf = (s: SubmissionRecord): string => `관리번호 ${s.id.slice(0, 8)}${/^\d{4}-\d{2}-\d{2}$/.test(s.configSnapshot.start) ? ` / 근로 개시일 ${s.configSnapshot.start}` : ""}`;

const windowEvents = async (store: ContractStore, month: string, submissionId?: string): Promise<ClockEventRecord[]> => {
  const w = payrollWindow(month);
  return store.listClockEvents({ from: w.from, to: w.to, ...(submissionId ? { submissionId } : {}) });
};

/** 직원 한 명의 급여 화면 데이터: 계약 정보, 기록, 설정, 이미 확정된 명세서. */
export async function payrollEmployee(store: ContractStore, id: string, month: string): Promise<PayrollResult> {
  if (!isMonth(month)) return { status: 400, body: { ok: false, error: "월은 YYYY-MM 형식이어야 합니다." } };
  const sub = await store.getSubmission(id);
  if (!sub || !isOwnerSigned(sub)) return { status: 404, body: { ok: false, error: "확정된 계약의 직원을 찾을 수 없습니다." } };
  const [settings, payroll, events, payslip] = await Promise.all([loadSettings(store), loadPayrollSettings(store), windowEvents(store, month, id), store.getPayslip(id, month)]);
  return {
    status: 200,
    body: {
      ok: true,
      month,
      employee: { id: sub.id, name: sub.name, employeeNo: employeeNoOf(sub) },
      biz: settings.company.biz,
      owner: settings.company.owner,
      minWage: settings.minWage,
      config: payrollConfigOf(sub.configSnapshot),
      defaultPayDate: defaultPayDate(month, sub.configSnapshot.payDay),
      rates: effectiveRates(payroll, month).rates,
      deductBreak: payroll.deductBreak,
      events: events.map(({ id: eid, kind, at, source, note }) => ({ id: eid, kind, at, source, note })),
      payslip,
    },
  };
}

export interface OverviewRow {
  id: string;
  name: string;
  status: "confirmed" | "draft";
  gross: number;
  net: number;
  blocking: number;
  revision: number;
  payDate: string;
  payslip: PayslipRecord | null;
}

/** 이 달 전 직원 급여 현황: 확정된 직원은 확정 금액, 나머지는 기본 입력으로 계산한 예상 금액. */
export async function payrollOverview(store: ContractStore, month: string): Promise<PayrollResult> {
  if (!isMonth(month)) return { status: 400, body: { ok: false, error: "월은 YYYY-MM 형식이어야 합니다." } };
  const [subs, settings, payroll, payslips, events] = await Promise.all([store.listSubmissions(), loadSettings(store), loadPayrollSettings(store), store.listPayslips({ month }), windowEvents(store, month)]);
  const bySub = new Map<string, ClockEventRecord[]>();
  for (const e of events) bySub.set(e.submissionId, [...(bySub.get(e.submissionId) ?? []), e]);
  const slip = new Map(payslips.map((p) => [p.submissionId, p]));
  const eff = effectiveRates(payroll, month);
  const rows: OverviewRow[] = confirmedSubs(subs)
    .map((s) => {
      const p = slip.get(s.id) ?? null;
      if (p) return { id: s.id, name: s.name, status: "confirmed" as const, gross: p.statement.gross, net: p.statement.net, blocking: 0, revision: p.revision, payDate: p.payDate, payslip: p };
      const st = computePayroll({ month, events: bySub.get(s.id) ?? [], config: payrollConfigOf(s.configSnapshot), deductBreak: payroll.deductBreak, minWage: settings.minWage, rates: eff.rates, input: emptyInput() });
      return { id: s.id, name: s.name, status: "draft" as const, gross: st.gross, net: st.net, blocking: st.blocking.length, revision: 0, payDate: "", payslip: null };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return { status: 200, body: { ok: true, month, biz: settings.company.biz, rows, rates: payroll.rates, autoRates: payroll.autoRates !== false, statutory: statutoryRatesFor(month), deductBreak: payroll.deductBreak } };
}

/** 급여를 확정해 저장한다. 서버가 다시 계산하고, 경고가 있으면 확인 표시(ack)가 있어야 한다. 다시 확정하면 차수가 올라간다. */
export async function confirmPayslip(store: ContractStore, body: unknown, now: Date = new Date()): Promise<PayrollResult> {
  const b = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const id = typeof b.id === "string" ? b.id : "";
  const month = typeof b.month === "string" ? b.month : "";
  if (!isMonth(month)) return { status: 400, body: { ok: false, error: "월은 YYYY-MM 형식이어야 합니다." } };
  if (month > nowMonth(now)) return { status: 400, body: { ok: false, error: "아직 시작하지 않은 달의 급여는 확정할 수 없습니다." } };
  const parsed = parsePayrollInput(b.input);
  if (!parsed.ok) return { status: 400, body: { ok: false, error: parsed.error } };
  const input = parsed.value;
  if (!input.payDate) return { status: 400, body: { ok: false, error: "임금 지급일을 입력해 주세요. 임금명세서에 반드시 들어가는 항목입니다." } };

  const sub = await store.getSubmission(id);
  if (!sub || !isOwnerSigned(sub)) return { status: 404, body: { ok: false, error: "확정된 계약의 직원을 찾을 수 없습니다." } };
  const [settings, payroll, events, existing] = await Promise.all([loadSettings(store), loadPayrollSettings(store), windowEvents(store, month, id), store.getPayslip(id, month)]);
  const statement: PayStatement = computePayroll({ month, events, config: payrollConfigOf(sub.configSnapshot), deductBreak: payroll.deductBreak, minWage: settings.minWage, rates: effectiveRates(payroll, month).rates, input });
  if (statement.errors.length) return { status: 400, body: { ok: false, error: statement.errors[0] } };
  if (!canConfirm(statement, input)) return { status: 409, body: { ok: false, code: "needs_ack", error: "확인이 필요한 항목이 있습니다. 내용을 확인한 뒤 '확인했습니다'에 체크하고 다시 확정해 주세요.", blocking: statement.blocking } };

  const rec: PayslipRecord = {
    id: existing?.id ?? newId(),
    submissionId: id,
    month,
    revision: (existing?.revision ?? 0) + 1,
    confirmedAt: now.toISOString(),
    payDate: input.payDate,
    employeeName: sub.name,
    employeeNo: employeeNoOf(sub),
    biz: settings.company.biz,
    owner: settings.company.owner,
    statement,
    input,
    history: existing ? [...existing.history, { revision: existing.revision, confirmedAt: existing.confirmedAt, gross: existing.statement.gross, net: existing.statement.net }] : [],
  };
  await store.putPayslip(rec);
  return { status: existing ? 200 : 201, body: { ok: true, payslip: rec } };
}

