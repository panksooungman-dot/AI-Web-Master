import type { PayrollRates } from "./payroll";

/**
 * 근로자 부담 법정 요율(귀속 연도별). 4대보험 요율은 해마다 1월에 바뀐다.
 * - 새 해의 요율이 고시되면 아래 표에 그 해를 한 줄 추가한다.
 * - 표에 없는 해는 자동 적용하지 않는다. 지난해 요율로 조용히 계산하지 않고, 사업주가 직접 입력한 값을 쓴다.
 * - 국민연금·건강보험·고용보험은 근로자 부담분(전체 요율의 절반 또는 근로자 몫), 장기요양은 건강보험료 대비 비율, 지방소득세는 소득세 대비 비율이다.
 *
 * 2026년: 국민연금 9.5%(근로자 4.75%) · 건강보험 7.19%(근로자 3.595%) · 장기요양 건강보험료의 13.14% · 고용보험 근로자 0.9%.
 */
export const STATUTORY_RATES: Readonly<Record<number, PayrollRates>> = {
  2026: { pension: 4.75, health: 3.595, ltc: 13.14, employment: 0.9, localTax: 10 },
};

/** 귀속 월("YYYY-MM")의 법정 요율. 그 해가 표에 없으면 null. */
export function statutoryRatesFor(month: string): PayrollRates | null {
  const r = STATUTORY_RATES[Number(month.slice(0, 4))];
  return r ? { ...r } : null;
}
