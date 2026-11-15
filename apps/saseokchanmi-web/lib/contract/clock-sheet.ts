import { dayMin, schedOf } from "./calc";
import { DAYS } from "./defaults";
import { esc, num, tm, won } from "./format";
import type { ContractConfig } from "./types";

/**
 * 월간 출퇴근 기록부 계산·표 만들기 (순수 함수, 서버·클라이언트 공용).
 * 출퇴근 기록(서버 시각, ISO)을 한국 시간(KST, UTC+9) 기준 날짜로 나누고, 계약서의 약정 근무와 비교한다.
 * 임금은 "기본시급 × 근무시간"의 참고용 값이며 주휴·연장·야간·휴일 가산수당은 계산하지 않는다.
 */

export interface SheetEvent {
  id: string;
  kind: "in" | "out";
  at: string;
  source: "device" | "admin";
  note: string;
}

export type SheetConfig = Pick<ContractConfig, "type" | "wageType" | "wage" | "start" | "useSched" | "sched" | "workS" | "workE" | "brkS" | "brkE" | "days">;

export interface ShiftCell {
  inId: string;
  inAt: string;
  outId: string | null;
  outAt: string | null;
  /** 이 근무의 실제 근무시간(분). 퇴근 기록이 없으면 0. */
  workedMin: number;
  edited: boolean;
}

export interface DayRow {
  date: string;
  day: number;
  /** 0=월 … 6=일 */
  dow: number;
  scheduledText: string;
  scheduledMin: number;
  shifts: ShiftCell[];
  workedMin: number;
  flags: string[];
}

export interface Sheet {
  month: string;
  rows: DayRow[];
  totals: {
    workedMin: number;
    /** 요일별 근무표가 없는 계약은 null(약정 합계를 계산할 수 없다). */
    scheduledMin: number | null;
    diffMin: number | null;
    workedDays: number;
    shiftCount: number;
    openCount: number;
    strayCount: number;
  };
  pay: { wage: number; amount: number } | null;
}

const KST_MS = 9 * 60 * 60 * 1000;
const p2 = (n: number) => String(n).padStart(2, "0");
/** 이 시간(분)을 넘는 한 번의 근무는 퇴근 누락일 수 있어 확인을 안내한다. */
const LONG_SHIFT_MIN = 16 * 60;

export const isMonth = (s: unknown): s is string => typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

/** ISO 시각 → 한국 시간 구성 요소. */
export function kst(iso: string) {
  const d = new Date(Date.parse(iso) + KST_MS);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return { y, m, d: day, hh: d.getUTCHours(), mm: d.getUTCMinutes(), dow: (d.getUTCDay() + 6) % 7, date: `${y}-${p2(m)}-${p2(day)}` };
}

export const hhmm = (iso: string): string => {
  const k = kst(iso);
  return `${p2(k.hh)}:${p2(k.mm)}`;
};

/** ISO → 입력창(datetime-local)에 넣을 한국 시간 "YYYY-MM-DDTHH:mm". */
export const toKstLocal = (iso: string): string => new Date(Date.parse(iso) + KST_MS).toISOString().slice(0, 16);

/** 한국 시간 "YYYY-MM-DDTHH:mm" → ISO. 형식이 틀리거나 없는 날짜(2월 30일 등)면 null. */
export function parseKstLocal(s: unknown): string | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  const ms = Date.parse(`${s}:00+09:00`);
  if (!Number.isFinite(ms)) return null;
  return toKstLocal(new Date(ms).toISOString()) === s ? new Date(ms).toISOString() : null;
}

/** "YYYY-MM" → 그 달의 시작(포함)·다음 달 시작(미포함) ISO와 일수. */
export function monthRange(month: string): { from: string; to: string; days: number } {
  const [y, m] = month.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const from = new Date(Date.parse(`${y}-${p2(m)}-01T00:00:00+09:00`));
  const to = new Date(Date.parse(`${ny}-${p2(nm)}-01T00:00:00+09:00`));
  return { from: from.toISOString(), to: to.toISOString(), days: Math.round((to.getTime() - from.getTime()) / 86_400_000) };
}

export function fmtMin(min: number): string {
  const sign = min < 0 ? "-" : "";
  const a = Math.abs(Math.round(min));
  const h = Math.floor(a / 60);
  const m = a % 60;
  if (h === 0) return `${sign}${m}분`;
  return m === 0 ? `${sign}${h}시간` : `${sign}${h}시간 ${m}분`;
}

interface Shift {
  inEv: SheetEvent;
  outEv: SheetEvent | null;
}

/** 시간순 기록을 출근→퇴근 짝으로 묶는다. 퇴근 없는 출근, 출근 없는 퇴근은 따로 남긴다. */
export function pairShifts(events: SheetEvent[]): { shifts: Shift[]; strayOuts: SheetEvent[] } {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  const shifts: Shift[] = [];
  const strayOuts: SheetEvent[] = [];
  let open: SheetEvent | null = null;
  for (const e of sorted) {
    if (e.kind === "in") {
      if (open) shifts.push({ inEv: open, outEv: null });
      open = e;
    } else if (open) {
      shifts.push({ inEv: open, outEv: e });
      open = null;
    } else {
      strayOuts.push(e);
    }
  }
  if (open) shifts.push({ inEv: open, outEv: null });
  return { shifts, strayOuts };
}

const breakMin = (bs: string, be: string): number => {
  const a = tm(bs);
  const b = tm(be);
  return a != null && b != null && b > a ? b - a : 0;
};

/** 그 요일의 약정 휴게시간(분). 요일별 근무표가 있으면 그 요일 칸, 없으면 공통 휴게시간. */
function scheduledBreak(c: SheetConfig, dow: number): number {
  if (c.useSched) {
    const x = schedOf(c)[dow];
    return x.t === "work" ? breakMin(x.bs, x.be) : 0;
  }
  return breakMin(c.brkS, c.brkE);
}

function scheduledOf(c: SheetConfig, dow: number, date: string): { text: string; min: number } {
  if (!c.useSched) return { text: "", min: 0 };
  if (/^\d{4}-\d{2}-\d{2}$/.test(c.start) && date < c.start) return { text: "-", min: 0 };
  const x = schedOf(c)[dow];
  if (x.t === "week") return { text: "주휴일", min: 0 };
  if (x.t !== "work") return { text: "-", min: 0 };
  const min = dayMin(x.s, x.e, x.bs, x.be);
  const brk = breakMin(x.bs, x.be);
  return { text: `${x.s}~${x.e}${brk ? ` (휴게 ${x.bs}~${x.be})` : ""}`, min };
}

/**
 * 한 달 기록부를 만든다. `events`에는 이 달 앞뒤 며칠을 넉넉히 넣어도 된다(달 경계의 근무를 맞추기 위해).
 * 근무는 출근한 날짜에 넣는다(자정을 넘겨 퇴근해도 출근한 날의 근무).
 */
export function buildSheet(input: { month: string; events: SheetEvent[]; config: SheetConfig; deductBreak: boolean }): Sheet {
  const { month, config, deductBreak } = input;
  const { days } = monthRange(month);
  const rows: DayRow[] = [];
  for (let d = 1; d <= days; d++) {
    const date = `${month}-${p2(d)}`;
    const dow = kst(`${date}T12:00:00+09:00`).dow;
    const s = scheduledOf(config, dow, date);
    rows.push({ date, day: d, dow, scheduledText: s.text, scheduledMin: s.min, shifts: [], workedMin: 0, flags: [] });
  }
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const { shifts, strayOuts } = pairShifts(input.events);

  let openCount = 0;
  for (const sh of shifts) {
    const row = byDate.get(kst(sh.inEv.at).date);
    if (!row) continue; // 이 달이 아닌 근무
    let worked = 0;
    if (sh.outEv) {
      const raw = Math.round((Date.parse(sh.outEv.at) - Date.parse(sh.inEv.at)) / 60_000);
      const brk = deductBreak ? scheduledBreak(config, row.dow) : 0;
      worked = brk && raw > brk ? raw - brk : raw;
      if (raw > LONG_SHIFT_MIN) row.flags.push("근무시간이 16시간을 넘습니다. 퇴근 기록을 확인하세요.");
    } else {
      openCount++;
      row.flags.push("퇴근 기록이 없습니다.");
    }
    const edited = sh.inEv.source === "admin" || sh.outEv?.source === "admin";
    row.shifts.push({ inId: sh.inEv.id, inAt: sh.inEv.at, outId: sh.outEv?.id ?? null, outAt: sh.outEv?.at ?? null, workedMin: worked, edited });
    row.workedMin += worked;
    if (edited && !row.flags.includes("관리자 입력·정정 포함")) row.flags.push("관리자 입력·정정 포함");
  }

  let strayCount = 0;
  for (const e of strayOuts) {
    const row = byDate.get(kst(e.at).date);
    if (!row) continue;
    strayCount++;
    row.flags.push(`출근 기록 없는 퇴근(${hhmm(e.at)})이 있습니다.`);
  }

  const workedMin = rows.reduce((a, r) => a + r.workedMin, 0);
  const scheduledMin = config.useSched ? rows.reduce((a, r) => a + r.scheduledMin, 0) : null;
  const wage = num(config.wage);
  const hourly = config.type !== "monthly" && config.wageType === "시급" && wage > 0;
  return {
    month,
    rows,
    totals: {
      workedMin,
      scheduledMin,
      diffMin: scheduledMin == null ? null : workedMin - scheduledMin,
      workedDays: rows.filter((r) => r.shifts.length > 0).length,
      shiftCount: rows.reduce((a, r) => a + r.shifts.length, 0),
      openCount,
      strayCount,
    },
    pay: hourly ? { wage, amount: Math.round((workedMin / 60) * wage) } : null,
  };
}

/** 이 직원의 기록 조회에 쓸 기간: 달 시작 이틀 전부터 다음 달 이틀 뒤까지(달 경계에 걸친 근무를 위해). */
export function fetchWindow(month: string): { from: string; to: string } {
  const r = monthRange(month);
  const day = 86_400_000;
  return { from: new Date(Date.parse(r.from) - 2 * day).toISOString(), to: new Date(Date.parse(r.to) + 2 * day).toISOString() };
}

export const monthLabel = (month: string): string => `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`;

const th = "border:1px solid #999;background:#eee;padding:3px 5px;font-weight:700;text-align:center";
const td = "border:1px solid #999;padding:3px 5px;text-align:center";

/** PDF·이미지·미리보기용 기록부 HTML. 사용자 입력은 모두 esc를 거친다. */
export function clockSheetHTML(sheet: Sheet, meta: { biz: string; name: string; deductBreak: boolean }): string {
  const t = sheet.totals;
  const rows = sheet.rows
    .map((r) => {
      const weekend = r.dow >= 5;
      const bg = weekend ? "background:#f6f6f6;" : "";
      const cell = (f: (s: ShiftCell) => string) => (r.shifts.length ? r.shifts.map((s) => esc(f(s))).join("<br>") : "");
      const note = r.flags.map((f) => esc(f)).join(" ");
      return (
        `<tr><td style="${td};${bg}">${r.day}</td><td style="${td};${bg}${r.dow === 6 ? "color:#c0392b;" : r.dow === 5 ? "color:#2c5aa0;" : ""}">${DAYS[r.dow]}</td>` +
        `<td style="${td};${bg}font-size:10px">${esc(r.scheduledText)}</td>` +
        `<td style="${td};${bg}">${cell((s) => hhmm(s.inAt))}</td>` +
        `<td style="${td};${bg}">${cell((s) => (s.outAt ? hhmm(s.outAt) : "-"))}</td>` +
        `<td style="${td};${bg}">${r.shifts.length ? esc(fmtMin(r.workedMin)) : ""}</td>` +
        `<td style="${td};${bg}text-align:left;font-size:9.5px;line-height:1.3;color:#a33">${note}</td></tr>`
      );
    })
    .join("");
  const diff = t.diffMin == null ? "" : ` / 약정 ${esc(fmtMin(t.scheduledMin ?? 0))} / 차이 ${t.diffMin > 0 ? "+" : ""}${esc(fmtMin(t.diffMin))}`;
  const pay = sheet.pay
    ? `<p style="margin:2px 0">참고용 예상 임금(기본시급 ${esc(won(sheet.pay.wage))} × 근무시간) : <b>${esc(won(sheet.pay.amount))}</b></p>`
    : "";
  return (
    `<p class="ct" style="font-size:1.55em;letter-spacing:.18em;margin:0 0 8px">월간 출퇴근 기록부</p>` +
    `<div class="ln" style="padding-left:0;min-height:1.8em">사업체명 : ${esc(meta.biz)} &nbsp; 직원 : <b>${esc(meta.name)}</b> &nbsp; 기간 : ${esc(monthLabel(sheet.month))}</div>` +
    `<table style="width:100%;border-collapse:collapse;margin:4px 0 8px;font-size:11px;line-height:1.25"><thead><tr>` +
    `<th style="${th};width:6%">일</th><th style="${th};width:6%">요일</th><th style="${th};width:24%">약정 근무</th><th style="${th};width:11%">출근</th><th style="${th};width:11%">퇴근</th><th style="${th};width:14%">근무시간</th><th style="${th}">비고</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>` +
    `<p style="margin:2px 0">합계 : 근무일 ${t.workedDays}일 / 실제 근무 <b>${esc(fmtMin(t.workedMin))}</b>${diff}</p>` +
    pay +
    `<p style="margin:6px 0 0;font-size:10px;color:#555">※ 근무시간은 출근·퇴근 기록 사이의 시간이며, 약정 휴게시간 자동 차감을 ${meta.deductBreak ? "적용했습니다" : "적용하지 않았습니다"}. 예상 임금은 참고용이며 주휴·연장·야간·휴일 가산수당은 포함하지 않습니다. 출퇴근 시각은 서버 기록(한국 시간) 기준이며 관리자가 정정한 기록은 비고에 표시됩니다.</p>` +
    `<div class="ln" style="padding-left:0;margin-top:12px"><b>직원 확인</b>&nbsp;(서명)&nbsp;＿＿＿＿＿＿＿ &nbsp;&nbsp;&nbsp; <b>사업주 확인</b>&nbsp;(서명)&nbsp;＿＿＿＿＿＿＿</div>`
  );
}
