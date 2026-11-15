import { describe, expect, it } from "vitest";
import { buildConfig } from "@/lib/contract";
import { buildSheet, clockSheetHTML, fetchWindow, fmtMin, hhmm, kst, monthRange, pairShifts, parseKstLocal, toKstLocal, type SheetConfig, type SheetEvent } from "@/lib/contract/clock-sheet";

/** 한국 시간 "2026-11-02T09:00" → ISO */
const k = (s: string) => new Date(`${s}:00+09:00`).toISOString();
let n = 0;
const ev = (kind: "in" | "out", at: string, source: "device" | "admin" = "device"): SheetEvent => ({ id: `e${++n}`, kind, at: k(at), source, note: "" });

const cfgOf = (over: Parameters<typeof buildConfig>[1] = {}): SheetConfig => {
  const c = buildConfig(null, { type: "hourly", wage: "12000", ...over });
  return { type: c.type, wageType: c.wageType, wage: c.wage, start: c.start, useSched: c.useSched, sched: c.sched, workS: c.workS, workE: c.workE, brkS: c.brkS, brkE: c.brkE, days: c.days };
};

/** 월·수 10:00~14:00(휴게 없음), 근로 개시 2026-11-10 */
const monWed = (): SheetConfig => {
  const base = buildConfig(null, { type: "hourly", wage: "12000", useSched: true, start: "2026-11-10" });
  const sched = base.sched.map((d, i) => (i === 0 || i === 2 ? { ...d, t: "work" as const, s: "10:00", e: "14:00", bs: "", be: "" } : { ...d, t: "off" as const }));
  return cfgOf({ useSched: true, start: "2026-11-10", sched });
};

describe("한국 시간 변환", () => {
  it("UTC 시각을 한국 날짜·요일로 바꾼다(자정 부근 포함)", () => {
    expect(kst("2026-11-14T15:30:00.000Z")).toMatchObject({ date: "2026-11-15", hh: 0, mm: 30, dow: 6 }); // 일요일 00:30 KST
    expect(kst(k("2026-11-02T09:05"))).toMatchObject({ date: "2026-11-02", dow: 0 }); // 월요일
    expect(hhmm(k("2026-11-02T09:05"))).toBe("09:05");
  });

  it("입력창 값 ↔ ISO 변환은 왕복이 맞고, 없는 날짜·잘못된 형식은 거부한다", () => {
    expect(parseKstLocal("2026-11-02T09:05")).toBe("2026-11-02T00:05:00.000Z");
    expect(toKstLocal("2026-11-02T00:05:00.000Z")).toBe("2026-11-02T09:05");
    for (const bad of ["2026-02-30T09:00", "2026-11-02 09:00", "2026-11-02", "", null, 5, "2026-13-01T00:00", "2026-11-02T25:00"]) expect(parseKstLocal(bad)).toBeNull();
  });

  it("달 범위와 조회 기간", () => {
    expect(monthRange("2026-11")).toEqual({ from: "2026-10-31T15:00:00.000Z", to: "2026-11-30T15:00:00.000Z", days: 30 });
    expect(monthRange("2026-12").to).toBe("2026-12-31T15:00:00.000Z");
    expect(monthRange("2026-02").days).toBe(28);
    expect(Date.parse(fetchWindow("2026-11").from)).toBeLessThan(Date.parse(monthRange("2026-11").from));
  });

  it("시간 표기", () => {
    expect(fmtMin(0)).toBe("0분");
    expect(fmtMin(90)).toBe("1시간 30분");
    expect(fmtMin(480)).toBe("8시간");
    expect(fmtMin(-45)).toBe("-45분");
  });
});

describe("출근·퇴근 짝짓기", () => {
  it("순서대로 묶고, 퇴근 없는 출근과 출근 없는 퇴근을 따로 남긴다", () => {
    const { shifts, strayOuts } = pairShifts([ev("out", "2026-11-02T08:00"), ev("in", "2026-11-02T10:00"), ev("out", "2026-11-02T14:00"), ev("in", "2026-11-03T10:00"), ev("in", "2026-11-04T10:00")]);
    expect(strayOuts).toHaveLength(1);
    expect(shifts.map((s) => [hhmm(s.inEv.at), s.outEv ? hhmm(s.outEv.at) : null])).toEqual([["10:00", "14:00"], ["10:00", null], ["10:00", null]]);
  });
});

describe("월간 기록부 계산", () => {
  it("근무를 출근한 날에 넣고 합계·약정·차이를 계산한다", () => {
    const events = [ev("in", "2026-11-11T10:00"), ev("out", "2026-11-11T14:30"), ev("in", "2026-11-16T09:50"), ev("out", "2026-11-16T13:50")];
    const s = buildSheet({ month: "2026-11", events, config: monWed(), deductBreak: true });
    expect(s.rows).toHaveLength(30);
    expect(s.rows[10]).toMatchObject({ date: "2026-11-11", dow: 2, scheduledText: "10:00~14:00", workedMin: 270 });
    expect(s.totals).toMatchObject({ workedMin: 510, workedDays: 2, shiftCount: 2, openCount: 0, strayCount: 0 });
    // 근로 개시일(11/10) 전의 월·수는 약정에서 제외: 월 16·23·30 + 수 11·18·25 = 6일 × 4시간
    expect(s.totals.scheduledMin).toBe(1440);
    expect(s.totals.diffMin).toBe(510 - 1440);
    expect(s.rows[1].scheduledText).toBe("-"); // 11/2 월요일이지만 근로 개시 전
    expect(s.rows[5].scheduledText).toBe("-"); // 일요일은 쉬는 날
  });

  it("자정을 넘겨 퇴근해도 출근한 날의 근무로 센다", () => {
    const s = buildSheet({ month: "2026-11", events: [ev("in", "2026-11-13T22:00"), ev("out", "2026-11-14T02:30")], config: cfgOf(), deductBreak: false });
    expect(s.rows[12].workedMin).toBe(270);
    expect(s.rows[13].shifts).toHaveLength(0);
  });

  it("달 경계: 전달 말에 출근한 근무는 전달 기록이고, 이 달 기록부에는 들어가지 않는다", () => {
    const events = [ev("in", "2026-10-31T22:00"), ev("out", "2026-11-01T02:00"), ev("in", "2026-11-30T22:00"), ev("out", "2026-12-01T01:00")];
    const s = buildSheet({ month: "2026-11", events, config: cfgOf(), deductBreak: false });
    expect(s.rows[0].shifts).toHaveLength(0); // 11/1 새벽 퇴근은 10/31 근무
    expect(s.totals.strayCount).toBe(0);
    expect(s.rows[29].workedMin).toBe(180); // 11/30 22시 출근 → 12/1 퇴근
    expect(s.totals.workedMin).toBe(180);
  });

  it("약정 휴게시간을 차감하고, 끄면 차감하지 않으며, 휴게보다 짧은 근무는 차감하지 않는다", () => {
    const base = buildConfig(null, { type: "hourly", wage: "12000", useSched: true });
    const sched = base.sched.map((d, i) => (i === 0 ? { ...d, t: "work" as const, s: "10:00", e: "19:00", bs: "14:00", be: "15:00" } : { ...d, t: "off" as const }));
    const config = cfgOf({ useSched: true, sched });
    const events = [ev("in", "2026-11-02T09:55"), ev("out", "2026-11-02T19:10"), ev("in", "2026-11-09T10:00"), ev("out", "2026-11-09T10:40")];
    const on = buildSheet({ month: "2026-11", events, config, deductBreak: true });
    expect(on.rows[1].workedMin).toBe(555 - 60);
    expect(on.rows[8].workedMin).toBe(40);
    expect(buildSheet({ month: "2026-11", events, config, deductBreak: false }).rows[1].workedMin).toBe(555);
    expect(on.rows[1].scheduledText).toBe("10:00~19:00 (휴게 14:00~15:00)");
  });

  it("요일별 근무표가 없는 계약은 약정 합계를 계산하지 않고, 공통 휴게시간을 차감한다", () => {
    const config = cfgOf({ useSched: false, workS: "10:00", workE: "19:00", brkS: "14:00", brkE: "15:00", days: "5" });
    const s = buildSheet({ month: "2026-11", events: [ev("in", "2026-11-03T10:00"), ev("out", "2026-11-03T19:00")], config, deductBreak: true });
    expect(s.totals.scheduledMin).toBeNull();
    expect(s.totals.diffMin).toBeNull();
    expect(s.rows[2].workedMin).toBe(480);
  });

  it("퇴근 누락·출근 없는 퇴근·정정 기록·과도하게 긴 근무에 안내를 붙인다", () => {
    const events = [ev("in", "2026-11-02T10:00"), ev("out", "2026-11-04T09:00"), ev("out", "2026-11-05T09:00"), ev("in", "2026-11-06T10:00", "admin")];
    const s = buildSheet({ month: "2026-11", events, config: cfgOf(), deductBreak: false });
    expect(s.rows[1].flags.join(" ")).toContain("16시간을 넘습니다");
    expect(s.rows[4].flags.join(" ")).toContain("출근 기록 없는 퇴근(09:00)");
    expect(s.rows[5].flags.join(" ")).toContain("퇴근 기록이 없습니다");
    expect(s.rows[5].flags.join(" ")).toContain("관리자 입력·정정 포함");
    expect(s.rows[5].shifts[0]).toMatchObject({ outAt: null, workedMin: 0, edited: true });
    expect(s.totals).toMatchObject({ openCount: 1, strayCount: 1 });
  });

  it("참고용 임금은 시급제만 계산하고 월급제는 계산하지 않는다", () => {
    const events = [ev("in", "2026-11-02T10:00"), ev("out", "2026-11-02T15:30")];
    expect(buildSheet({ month: "2026-11", events, config: cfgOf(), deductBreak: false }).pay).toEqual({ wage: 12000, amount: 66000 });
    const monthly = cfgOf({ type: "monthly", wageType: "월급", basePay: "2000000" });
    expect(buildSheet({ month: "2026-11", events, config: monthly, deductBreak: false }).pay).toBeNull();
    expect(buildSheet({ month: "2026-11", events: [], config: cfgOf({ wage: "" }), deductBreak: false }).pay).toBeNull();
  });
});

describe("기록부 HTML", () => {
  it("직원·사업체 이름의 HTML은 이스케이프하고, 합계·안내 문구·서명란을 넣는다", () => {
    const events = [ev("in", "2026-11-02T10:00"), ev("out", "2026-11-02T14:00"), ev("in", "2026-11-03T10:00")];
    const sheet = buildSheet({ month: "2026-11", events, config: cfgOf(), deductBreak: false });
    const html = clockSheetHTML(sheet, { biz: "<script>x</script>", name: '"홍"<b>길동</b>', deductBreak: false });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>길동</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("2026년 11월");
    expect(html).toContain("월간 출퇴근 기록부");
    expect(html).toContain("실제 근무 <b>4시간</b>");
    expect(html).toContain("참고용 예상 임금");
    expect(html).toContain("48,000원");
    expect(html).toContain("퇴근 기록이 없습니다");
    expect(html).toContain("직원 확인");
    expect(html).toContain("자동 차감을 적용하지 않았습니다");
    expect((html.match(/<tr>/g) ?? []).length).toBe(31); // 머리글 1 + 하루 30
  });
});
