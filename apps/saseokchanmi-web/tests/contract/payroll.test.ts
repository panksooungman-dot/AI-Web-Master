import { describe, expect, it } from "vitest";
import { buildConfig } from "@/lib/contract";
import type { SheetEvent } from "@/lib/contract/clock-sheet";
import { canConfirm, computePayroll, emptyInput, emptyRates, payrollWindow, payslipHTML, type PayrollConfig, type PayrollInput, type PayrollRates } from "@/lib/contract/payroll";

const k = (s: string) => new Date(`${s}:00+09:00`).toISOString();
let n = 0;
const ev = (kind: "in" | "out", at: string, source: "device" | "admin" = "device"): SheetEvent => ({ id: `e${++n}`, kind, at: k(at), source, note: "" });
const shift = (date: string, a = "10:00", b = "14:00") => [ev("in", `${date}T${a}`), ev("out", `${date}T${b}`)];

const cfg = (over: Parameters<typeof buildConfig>[1] = {}): PayrollConfig => {
  const c = buildConfig(null, { type: "hourly", wage: "10000", ...over });
  return { type: c.type, wageType: c.wageType, wage: c.wage, start: c.start, useSched: c.useSched, sched: c.sched, workS: c.workS, workE: c.workE, brkS: c.brkS, brkE: c.brkE, days: c.days, holiday: c.holiday, basePay: c.basePay, allow: c.allow, ins: c.ins, payDay: c.payDay };
};
/** 월~금 10:00~14:00(휴게 없음) 주 20시간 */
const weekdays = (start: string, over: Parameters<typeof buildConfig>[1] = {}) => {
  const base = buildConfig(null, { type: "hourly", wage: "12000", useSched: true, start });
  const sched = base.sched.map((d, i) => (i < 5 ? { ...d, t: "work" as const, s: "10:00", e: "14:00", bs: "", be: "" } : { ...d, t: i === 6 ? ("week" as const) : ("off" as const), s: "", e: "", bs: "", be: "" }));
  return cfg({ wage: "12000", useSched: true, start, sched, holiday: "separate", ...over });
};
const run = (config: PayrollConfig, events: SheetEvent[], over: Partial<{ rates: PayrollRates; input: PayrollInput; minWage: number; month: string }> = {}) =>
  computePayroll({ month: over.month ?? "2026-11", events, config, deductBreak: false, minWage: over.minWage ?? 10320, rates: over.rates ?? emptyRates(), input: over.input ?? emptyInput() });
const RATES: PayrollRates = { pension: 4.5, health: 3.5, ltc: 12.95, employment: 0.9, localTax: 10 };

describe("시급제 기본급·주휴수당", () => {
  // 2026-11: 일요일은 1·8·15·22·29일. 근로 개시 11/2(월).
  const week = (mon: string, skip: number[] = []) => [0, 1, 2, 3, 4].filter((i) => !skip.includes(i)).flatMap((i) => shift(addDay(mon, i)));
  const addDay = (d: string, i: number) => new Date(Date.parse(`${d}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);

  it("개근한 주마다 주휴수당을 더하고, 결근한 주는 뺀다", () => {
    const events = [...week("2026-11-02"), ...week("2026-11-09", [2]), ...week("2026-11-16"), ...week("2026-11-23")];
    const s = run(weekdays("2026-11-02"), events);
    const byKey = Object.fromEntries(s.earnings.map((l) => [l.key, l]));
    expect(byKey.base.amount).toBe(19 * 4 * 12000); // 근무 19일 × 4시간
    expect(byKey.holiday.amount).toBe(3 * 48000); // 12,000 × (20/40) × 8 = 48,000, 4주 중 3주 개근
    expect(byKey.holiday.basis).toContain("개근 3주");
    expect(s.notes.join(" ")).toContain("11/15 주간");
    expect(s.gross).toBe(912000 + 144000);
    expect(s.net).toBe(s.gross); // 공제율 미설정
  });

  it("전달에 걸친 주(월 10/26~일 11/1)는 전달 출근 기록까지 보고 이 달에 계산한다", () => {
    const events = [...[0, 1, 2, 3, 4].flatMap((i) => shift(addDay("2026-10-26", i)))];
    const s = run(weekdays("2026-10-01"), events);
    expect(s.earnings.find((l) => l.key === "holiday")?.amount).toBe(48000); // 11/1 주 1주만 개근, 나머지 주는 기록 없음
    expect(s.earnings.find((l) => l.key === "base")?.amount).toBe(0); // 10월 근무는 이 달 기본급에 넣지 않는다
  });

  it("근로 개시 이전의 날은 소정근로일로 보지 않는다(개시 주는 개시일 이후 소정근로일로 판단)", () => {
    const events = [2, 3, 4].flatMap((i) => shift(addDay("2026-11-02", i))); // 수·목·금(11/4~6)만 출근
    const s = run(weekdays("2026-11-04"), events); // 개시 11/4(수)
    expect(s.earnings.find((l) => l.key === "holiday")?.amount).toBe(48000);
  });

  it("요일별 근무표가 없으면 주휴수당을 계산하지 않고 안내한다", () => {
    const s = run(cfg({ holiday: "separate" }), shift("2026-11-02"));
    expect(s.earnings.map((l) => l.key)).toEqual(["base"]);
    expect(s.notes.join(" ")).toContain("요일별 근무표가 없어 주휴수당을 자동 계산하지 못했습니다");
  });

  it("주휴수당을 별도로 지급하지 않는 계약이면 계산하지 않는다", () => {
    const s = run(weekdays("2026-11-02", { holiday: "none" }), week("2026-11-02"));
    expect(s.earnings.map((l) => l.key)).toEqual(["base"]);
  });

  it("1주 소정근로시간이 15시간 미만이면 주휴수당 대상이 아니다", () => {
    const base = buildConfig(null, { type: "hourly", wage: "12000", useSched: true, start: "2026-11-02" });
    const sched = base.sched.map((d, i) => (i < 3 ? { ...d, t: "work" as const, s: "10:00", e: "14:00", bs: "", be: "" } : { ...d, t: "off" as const }));
    const s = run(cfg({ wage: "12000", useSched: true, start: "2026-11-02", sched }), shift("2026-11-02"));
    expect(s.earnings.map((l) => l.key)).toEqual(["base"]);
    expect(s.notes.join(" ")).toContain("15시간 미만");
  });

  it("최저시급보다 낮으면 안내한다", () => {
    expect(run(cfg({ wage: "9000", holiday: "none" }), shift("2026-11-02")).notes.join(" ")).toContain("최저시급");
  });
});

describe("월급제", () => {
  it("기본급과 고정수당을 그대로 지급하고 근무 기록과 무관하다", () => {
    const c = cfg({ type: "monthly", wageType: "월급", wage: "", basePay: "2000000", allow: [{ n: "식대", a: "100000" }, { n: "", a: "5000" }] });
    const s = run(c, []);
    expect(s.earnings.map((l) => [l.label, l.amount])).toEqual([["기본급", 2000000], ["식대", 100000]]);
    expect(s.gross).toBe(2100000);
    expect(s.notes.join(" ")).toContain("주휴수당이 포함");
  });

  it("근로 개시일이 이 달 중간이면 일할 계산을 안내한다", () => {
    const c = cfg({ type: "monthly", wageType: "월급", wage: "", basePay: "2000000", start: "2026-11-15" });
    expect(run(c, []).notes.join(" ")).toContain("일할 계산");
  });
});

describe("공제와 조정", () => {
  const base = () => run(cfg({ holiday: "none" }), Array.from({ length: 10 }, (_, i) => shift(`2026-11-${String(2 + i).padStart(2, "0")}`, "10:00", "20:00")).flat(), { rates: RATES });

  it("설정한 공제율로 계산하고 10원 미만을 절사하며 장기요양은 건강보험료 기준이다", () => {
    const s = base();
    expect(s.gross).toBe(1000000); // 100시간 × 10,000원
    const d = Object.fromEntries(s.deductions.map((l) => [l.key, l.amount]));
    expect(d).toEqual({ pension: 45000, health: 35000, ltc: 4530, employment: 9000 });
    expect(s.deductionTotal).toBe(93530);
    expect(s.net).toBe(1000000 - 93530);
    expect(s.deductions.find((l) => l.key === "ltc")?.basis).toContain("건강보험료");
  });

  it("공제율이 0이면 그 항목은 계산하지 않고 안내한다", () => {
    const s = run(cfg({ holiday: "none" }), shift("2026-11-02"), { rates: { ...emptyRates(), pension: 4.5 } });
    expect(s.deductions.map((l) => l.key)).toEqual(["pension"]);
    expect(s.notes.join(" ")).toContain("공제율이 설정되지 않아 계산하지 않은 항목: 건강보험, 장기요양보험, 고용보험");
  });

  it("계약서에서 미적용으로 표시한 보험은 공제하지 않는다", () => {
    const c = cfg({ holiday: "none", ins: { emp: "n", acc: "y", pen: "n", hlt: "y" } });
    const s = run(c, Array.from({ length: 10 }, (_, i) => shift(`2026-11-${String(2 + i).padStart(2, "0")}`, "10:00", "20:00")).flat(), { rates: RATES });
    expect(s.deductions.map((l) => l.key)).toEqual(["health", "ltc"]);
    expect(s.notes.join(" ")).toContain("미적용으로 표시된 보험: 국민연금, 고용보험");
  });

  it("직접 입력한 금액이 자동 계산을 대신하고, 소득세·지방소득세·기타 지급·공제를 더한다", () => {
    const events = Array.from({ length: 10 }, (_, i) => shift(`2026-11-${String(2 + i).padStart(2, "0")}`, "10:00", "20:00")).flat();
    const input: PayrollInput = { ...emptyInput(), override: { health: 36000, incomeTax: 10000 }, extraEarnings: [{ label: "식대", amount: 50000 }], extraDeductions: [{ label: "가불", amount: 20000 }] };
    const s = run(cfg({ holiday: "none" }), events, { rates: RATES, input });
    const d = Object.fromEntries(s.deductions.map((l) => [l.key, l.amount]));
    expect(d.health).toBe(36000);
    expect(d.ltc).toBe(4660); // 36,000 × 12.95% = 4,662 → 10원 미만 절사
    expect(d.incomeTax).toBe(10000);
    expect(d.localTax).toBe(1000); // 소득세의 10%
    expect(d["extra-d0"]).toBe(20000);
    expect(s.gross).toBe(1050000);
    expect(s.earnings.find((l) => l.label === "식대")?.basis).toBe("사업주 입력");
  });
});

describe("확정 전 경고", () => {
  it("퇴근 기록 누락·출근 없는 퇴근은 확인(ack) 없이 확정할 수 없다", () => {
    const s = run(cfg({ holiday: "none" }), [ev("in", "2026-11-02T10:00"), ev("out", "2026-11-03T09:00")].slice(0, 1));
    expect(s.blocking.join(" ")).toContain("퇴근 기록이 없는 근무가 1건");
    expect(canConfirm(s, emptyInput())).toBe(false);
    expect(canConfirm(s, { ...emptyInput(), ack: true })).toBe(true);
    expect(canConfirm(run(cfg({ holiday: "none" }), shift("2026-11-02")), emptyInput())).toBe(true);
  });

  it("공제 합계가 총지급액보다 크면 막는다", () => {
    const s = run(cfg({ holiday: "none" }), shift("2026-11-02"), { input: { ...emptyInput(), extraDeductions: [{ label: "가불", amount: 999999 }] } });
    expect(s.errors.join(" ")).toContain("공제 합계가 총지급액보다");
    expect(canConfirm(s, { ...emptyInput(), ack: true })).toBe(false); // 확인 표시로도 넘길 수 없다
  });

  it("기록 조회 기간은 달 시작 8일 전부터 달 끝 이후까지", () => {
    const w = payrollWindow("2026-11");
    expect(Date.parse(w.from)).toBeLessThanOrEqual(Date.parse(k("2026-10-24T00:00")));
    expect(Date.parse(w.to)).toBeGreaterThan(Date.parse(k("2026-12-01T00:00")));
  });
});

describe("임금명세서 HTML", () => {
  it("법정 기재사항과 계산 방법을 담고 사용자 입력은 이스케이프한다", () => {
    const s = run(cfg({ holiday: "none" }), shift("2026-11-02"), { rates: RATES, input: { ...emptyInput(), extraEarnings: [{ label: "<b>식대</b>", amount: 5000 }] } });
    const html = payslipHTML(s, { biz: "<i>사색찬미</i>", owner: "황", name: "<script>x</script>", employeeNo: "근로개시 2026-11-02", payDate: "2026-12-10", revision: 2 });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>식대</b>");
    expect(html).not.toContain("<i>사색찬미</i>");
    for (const t of ["임 금 명 세 서", "2026년 11월", "2026년 12월 10일", "임금 총액", "공제 총액", "실수령액", "계산 방법", "근로기준법 제48조", "5인 미만", "정정 발행 2차"]) expect(html).toContain(t);
  });
});
