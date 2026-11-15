import { buildSheet, fmtMin, monthLabel, type SheetConfig, type SheetEvent } from "./clock-sheet";
import { esc, won } from "./format";

/**
 * 전 직원 월간 출퇴근 요약 (순수 함수, 서버·클라이언트 공용).
 * 직원별 계산은 월간 기록부(buildSheet)를 그대로 쓰므로 직원 한 명의 기록부와 숫자가 항상 같다.
 * 임금은 시급제의 "기본시급 × 근무시간" 참고 값이며 주휴·연장·야간·휴일 가산수당은 포함하지 않는다.
 */

export interface SummaryInput {
  id: string;
  name: string;
  config: SheetConfig;
  events: SheetEvent[];
}

export interface SummaryRow {
  id: string;
  name: string;
  workedDays: number;
  workedMin: number;
  /** 요일별 근무표가 없는 계약은 null */
  scheduledMin: number | null;
  diffMin: number | null;
  /** hourly: 예상 임금 계산함 / monthly: 월급제(계산 안 함) / none: 시급 정보 없음 */
  payType: "hourly" | "monthly" | "none";
  wage: number;
  pay: number | null;
  /** 퇴근 기록이 없는 근무 수 */
  openCount: number;
  /** 출근 기록 없는 퇴근 수 */
  strayCount: number;
  /** 관리자가 입력·정정한 기록이 포함되어 있는가 */
  edited: boolean;
}

export interface Summary {
  month: string;
  rows: SummaryRow[];
  totals: { workedDays: number; workedMin: number; pay: number; hasPay: boolean; openCount: number; strayCount: number };
}

export function buildSummary(input: { month: string; employees: SummaryInput[]; deductBreak: boolean }): Summary {
  const rows: SummaryRow[] = input.employees
    .map((e) => {
      const s = buildSheet({ month: input.month, events: e.events, config: e.config, deductBreak: input.deductBreak });
      return {
        id: e.id,
        name: e.name,
        workedDays: s.totals.workedDays,
        workedMin: s.totals.workedMin,
        scheduledMin: s.totals.scheduledMin,
        diffMin: s.totals.diffMin,
        payType: s.pay ? ("hourly" as const) : e.config.type === "monthly" ? ("monthly" as const) : ("none" as const),
        wage: s.pay?.wage ?? 0,
        pay: s.pay?.amount ?? null,
        openCount: s.totals.openCount,
        strayCount: s.totals.strayCount,
        edited: s.rows.some((r) => r.shifts.some((x) => x.edited)),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return {
    month: input.month,
    rows,
    totals: {
      workedDays: rows.reduce((a, r) => a + r.workedDays, 0),
      workedMin: rows.reduce((a, r) => a + r.workedMin, 0),
      pay: rows.reduce((a, r) => a + (r.pay ?? 0), 0),
      hasPay: rows.some((r) => r.pay != null),
      openCount: rows.reduce((a, r) => a + r.openCount, 0),
      strayCount: rows.reduce((a, r) => a + r.strayCount, 0),
    },
  };
}

/** 엑셀에서 수식으로 실행될 수 있는 문자(=, +, -, @ 등)로 시작하는 글자는 앞에 작은따옴표를 붙여 글자로만 열리게 한다. */
export function csvCell(v: string | number | null): string {
  if (v === null) return "";
  if (typeof v === "number") return String(v);
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const payNote = (r: SummaryRow) => (r.payType === "monthly" ? "월급제" : r.pay == null ? "" : String(r.pay));

/** 엑셀로 열 수 있는 CSV. (한글이 깨지지 않게 하려면 파일 맨 앞에 BOM을 붙여 저장한다.) */
export function summaryCsv(s: Summary): string {
  const header = ["직원", "근무일수", "실제 근무(분)", "실제 근무", "약정 근무(분)", "차이(분)", "기본시급(원)", "참고용 예상 임금(원)", "퇴근 기록 없음(건)", "출근 기록 없는 퇴근(건)", "관리자 정정 포함"];
  const lines = s.rows.map((r) => [r.name, r.workedDays, r.workedMin, fmtMin(r.workedMin), r.scheduledMin, r.diffMin, r.payType === "hourly" ? r.wage : null, payNote(r) || null, r.openCount, r.strayCount, r.edited ? "예" : "아니오"]);
  const total = ["합계", s.totals.workedDays, s.totals.workedMin, fmtMin(s.totals.workedMin), null, null, null, s.totals.hasPay ? s.totals.pay : null, s.totals.openCount, s.totals.strayCount, ""];
  return [header, ...lines, total].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const th = "border:1px solid #999;background:#eee;padding:4px 5px;font-weight:700;text-align:center";
const td = "border:1px solid #999;padding:4px 6px;text-align:center";

/** PDF·이미지·미리보기용 요약표 HTML. 사용자 입력은 모두 esc를 거친다. */
export function summaryHTML(s: Summary, meta: { biz: string; deductBreak: boolean }): string {
  const t = s.totals;
  const body = s.rows
    .map((r) => {
      const notes: string[] = [];
      if (r.openCount) notes.push(`퇴근 기록 없음 ${r.openCount}건`);
      if (r.strayCount) notes.push(`출근 기록 없는 퇴근 ${r.strayCount}건`);
      if (r.edited) notes.push("관리자 입력·정정 포함");
      const diff = r.diffMin == null ? "-" : `${r.diffMin > 0 ? "+" : ""}${fmtMin(r.diffMin)}`;
      const pay = r.payType === "monthly" ? "월급제" : r.pay == null ? "-" : won(r.pay);
      return (
        `<tr><td style="${td};font-weight:700">${esc(r.name)}</td><td style="${td}">${r.workedDays}일</td><td style="${td}">${esc(fmtMin(r.workedMin))}</td>` +
        `<td style="${td}">${r.scheduledMin == null ? "-" : esc(fmtMin(r.scheduledMin))}</td><td style="${td}">${esc(diff)}</td><td style="${td}">${esc(pay)}</td>` +
        `<td style="${td};text-align:left;font-size:10px;line-height:1.3;color:#a33">${notes.map((n) => esc(n)).join("<br>")}</td></tr>`
      );
    })
    .join("");
  const empty = s.rows.length ? "" : `<tr><td style="${td}" colspan="7">표시할 직원이 없습니다.</td></tr>`;
  return (
    `<p class="ct" style="font-size:1.55em;letter-spacing:.18em;margin:0 0 8px">월간 출퇴근 요약</p>` +
    `<div class="ln" style="padding-left:0;min-height:1.8em">사업체명 : ${esc(meta.biz)} &nbsp; 기간 : ${esc(monthLabel(s.month))} &nbsp; 직원 ${s.rows.length}명</div>` +
    `<table style="width:100%;border-collapse:collapse;margin:4px 0 8px;font-size:11.5px;line-height:1.3"><thead><tr>` +
    `<th style="${th}">직원</th><th style="${th}">근무일</th><th style="${th}">실제 근무</th><th style="${th}">약정 근무</th><th style="${th}">차이</th><th style="${th}">참고용 예상 임금</th><th style="${th};width:24%">비고</th>` +
    `</tr></thead><tbody>${body}${empty}</tbody>` +
    `<tfoot><tr><td style="${td};background:#f6f6f6;font-weight:700">합계</td><td style="${td};background:#f6f6f6;font-weight:700">${t.workedDays}일</td><td style="${td};background:#f6f6f6;font-weight:700">${esc(fmtMin(t.workedMin))}</td>` +
    `<td style="${td};background:#f6f6f6">-</td><td style="${td};background:#f6f6f6">-</td><td style="${td};background:#f6f6f6;font-weight:700">${t.hasPay ? esc(won(t.pay)) : "-"}</td><td style="${td};background:#f6f6f6"></td></tr></tfoot></table>` +
    `<p style="margin:6px 0 0;font-size:10px;color:#555">※ 근무시간은 출근·퇴근 기록 사이의 시간이며, 약정 휴게시간 자동 차감을 ${meta.deductBreak ? "적용했습니다" : "적용하지 않았습니다"}. 예상 임금은 시급제 직원의 기본시급 × 근무시간으로 계산한 참고 값이며 주휴·연장·야간·휴일 가산수당은 포함하지 않습니다. 월급제 직원은 임금을 계산하지 않습니다. 출퇴근 시각은 서버 기록(한국 시간) 기준입니다.</p>`
  );
}
