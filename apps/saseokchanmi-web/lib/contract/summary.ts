import { calc } from "./calc";
import { TYPE_NAME, INSK } from "./defaults";
import { dateKo, fT, nh, num, won } from "./format";
import { wageStr } from "./calc";
import type { ContractConfig } from "./types";

export interface SummaryRow {
  label: string;
  value: string;
}

/**
 * 근로자 확인 단계의 "핵심 조건 요약 카드" (요청서 3-2). 계약서 전문을 읽기 전에 중요한 조건만 먼저 보여 준다.
 * 계약서 본문과 같은 계산(calc, wageStr)을 쓰므로 두 곳의 숫자가 어긋나지 않는다.
 */
export function summarizeContract(C: ContractConfig): SummaryRow[] {
  const k = calc(C);
  const rows: SummaryRow[] = [{ label: "고용형태", value: TYPE_NAME[C.type] ?? C.type }];

  const start = dateKo(C.start);
  rows.push({ label: "근로 개시일", value: start || "별도 협의" });
  rows.push({ label: "계약 기간", value: C.termType === "fixed" ? (dateKo(C.end) ? `${start || "개시일"}부터 ${dateKo(C.end)}까지` : "기간을 정함") : "기간의 정함이 없음" });
  if (C.duty) rows.push({ label: "업무 내용", value: C.duty });

  if (C.useSched) {
    rows.push({ label: "근무 요일", value: k.workDays.length ? `${k.workDays.join(", ")}요일 (요일별 근무표)` : "요일별 근무표" });
  } else {
    rows.push({ label: "근무 시간", value: `${fT(C.workS)} ~ ${fT(C.workE)}` + (C.brkS && C.brkE ? ` (휴게 ${fT(C.brkS)} ~ ${fT(C.brkE)})` : "") });
    rows.push({ label: "근무 요일", value: `매주 ${k.days}일` });
  }
  rows.push({ label: "1주 근로시간", value: `${nh(k.weekMin / 60)}시간` });

  rows.push({ label: "임금", value: wageStr(C) + (C.wageType === "월급" && C.allow.some((a) => a.n && num(a.a)) ? " (고정수당 포함)" : "") });
  if (C.payDay) rows.push({ label: "임금 지급일", value: `매월 ${C.payDay}일` });
  if (C.payMethod) rows.push({ label: "지급 방법", value: C.payMethod === "bank" ? "근로자 명의 예금통장에 입금" : "근로자에게 직접 지급" });
  if (C.bonus === "has" && num(C.bonusAmt)) rows.push({ label: "상여금", value: won(num(C.bonusAmt)) });

  const applied = INSK.filter(([key]) => C.ins[key] !== "n").map(([, name]) => name);
  const off = INSK.filter(([key]) => C.ins[key] === "n").map(([, name]) => name);
  rows.push({ label: "4대 사회보험", value: (applied.length ? `가입: ${applied.join(", ")}` : "가입 없음") + (off.length ? ` / 미적용: ${off.join(", ")}` : "") });
  return rows;
}
