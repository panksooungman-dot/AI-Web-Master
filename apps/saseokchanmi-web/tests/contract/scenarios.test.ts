import { describe, expect, it } from "vitest";
import {
  buildConfig,
  calc,
  checkConfig,
  contractHTML,
  DEFAULT_COMPANY,
  holidayLine,
  monthHours,
  monthlyTotal,
  validateInsForm,
  validateWorkerInfo,
  wageCalcSummary,
} from "@/lib/contract";
import type { ContractConfig, InsForm } from "@/lib/contract";

/** 요청서 10장 확인 시나리오 중 순수 계산·렌더링으로 검증 가능한 것. */

const text = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");

const hourly = (over: Partial<ContractConfig> = {}) =>
  buildConfig(null, { type: "hourly", wage: "12000", date: "2026-12-01", start: "2026-12-01", label: "홍길동", ...over });

describe("시나리오 1: 시급제 (12,000원, 주 5일, 09:00~18:00, 휴게 14:00~15:00)", () => {
  const C = hourly();

  it("주 40시간, 주휴시간 8시간, 주휴수당 96,000원, 환산액 2,400원", () => {
    expect(calc(C).weekMin / 60).toBe(40);
    const lines = holidayLine(C).join("\n");
    expect(lines).toContain("주휴시간 : 1주 8시간");
    expect(lines).toContain("96,000원");
    expect(lines).toContain("2,400원");
    expect(lines).toContain("14,400원"); // 기본시급 + 환산액 (참고)
  });

  it("계약서 6번에 주휴수당 별도 줄이 표기된다", () => {
    const t = text(contractHTML({}, C));
    expect(t).toContain("주휴수당 총액 : 1주 96,000원");
    expect(t).toContain("주휴수당은 기본시급과 별도로 지급하며");
  });
});

describe("시나리오 2: 월급제 (기본급 2,200,000원, 식대 100,000원)", () => {
  const C = buildConfig(null, {
    type: "monthly",
    basePay: "2200000",
    allow: [{ n: "식대", a: "100000" }, { n: "", a: "" }, { n: "", a: "" }],
    label: "김월급",
  });

  it("월 소정근로시간 209시간, 월급 합계 2,300,000원", () => {
    expect(monthHours(C)).toBe(209);
    expect(monthlyTotal(C)).toBe(2300000);
  });

  it("계약서에 월급 합계·식대·주휴수당 포함 문구가 나온다", () => {
    const t = text(contractHTML({}, C));
    expect(t).toContain("월급 2,300,000원");
    expect(t).toContain("식대 : 100,000원");
    expect(t).toContain("월 소정근로시간 : 209시간 (주휴시간 포함)");
    expect(t).toContain("월급에는 주휴수당이 포함되어 있음");
  });

  it("관리자 임금 계산 패널: 환산 시급 = 월급 합계 ÷ 월 소정근로시간", () => {
    const s = wageCalcSummary(C);
    expect(s.ready).toBe(true);
    expect(s.rows.find((r) => r.label === "환산 시급")?.value).toBe("11,005원");
    expect(s.warning).toBeUndefined();
  });
});

describe("시나리오 3: 파트타임 (요일별 근무표)", () => {
  const sched = (hours: number, dayIdx: number[]) =>
    Array.from({ length: 7 }, (_, i) =>
      dayIdx.includes(i) ? { t: "work" as const, s: "09:00", e: String(9 + hours).padStart(2, "0") + ":00", bs: "", be: "" } : { t: "off" as const, s: "", e: "", bs: "", be: "" },
    );

  it("월·수 하루 5시간(주 10시간)이면 근무표가 나오고 주휴수당 줄은 없다", () => {
    const C = buildConfig(null, { type: "parttime", wage: "12000", label: "박알바", sched: sched(5, [0, 2]) });
    expect(calc(C).weekMin / 60).toBe(10);
    expect(holidayLine(C)).toEqual([]);
    const t = text(contractHTML({}, C));
    expect(t).toContain("월요일 09시 00분 ~ 14시 00분");
    expect(t).toContain("수요일 09시 00분 ~ 14시 00분");
    expect(t).not.toContain("주휴수당 총액");
  });

  it("주 15시간 이상이면 주휴수당 줄이 생긴다", () => {
    const C = buildConfig(null, { type: "parttime", wage: "12000", label: "박알바", sched: sched(4, [0, 1, 2, 3]) });
    expect(calc(C).weekMin / 60).toBe(16);
    expect(holidayLine(C).join("\n")).toContain("주휴시간 : 1주 3.2시간");
  });

  it("파트타임은 근무표가 없으면 7일 모두 휴무에서 시작한다", () => {
    const C = buildConfig(null, { type: "parttime" });
    expect(C.useSched).toBe(true);
    expect(C.sched.every((x) => x.t === "off")).toBe(true);
    expect(checkConfig({ ...C, label: "x", wage: "10000" }).errors).toContain("근무하는 요일을 정해 주세요.");
  });
});

describe("시나리오 4·5: 사회보험 사유서", () => {
  const goodForm: InsForm = { r: { pen: "1", hlt: "1" }, other: "", birth: "1990-05-21", detail: "주 2일 근무", c: [true, true, true] };
  const partial = () => hourly({ ins: { emp: "y", acc: "y", pen: "n", hlt: "n" } });
  const worker = { name: "홍길동", phone: "010-1234-5678", address: "경기 파주시 광탄면 1길 2", signedAt: "2026-12-01T03:00:00.000Z" };

  it("국민연금·건강보험 미적용이면 계약서 뒤에 사유서가 붙는다", () => {
    const html = contractHTML({ ...worker, insForm: goodForm }, partial());
    expect(html).toContain("4대 사회보험 미적용 사유서");
    expect(html).toContain("국민연금 : 적용 [");
    const t = text(html);
    expect(t).toContain("☑ 미적용");
    expect(t).toContain("2026년 12월 1일"); // 서명일(KST)
    expect(html.indexOf("표 준 근 로 계 약 서")).toBeLessThan(html.indexOf("미적용 사유서"));
  });

  it("사유서 입력이 비어 있으면 검증에서 막힌다", () => {
    const C = partial();
    expect(validateInsForm(C, null)).toBe("미적용 사유를 모두 선택해 주세요.");
    expect(validateInsForm(C, { ...goodForm, r: { pen: "1" } })).toBe("미적용 사유를 모두 선택해 주세요.");
    expect(validateInsForm(C, { ...goodForm, r: { pen: "4", hlt: "1" }, other: " " })).toBe("기타 사유를 적어 주세요.");
    expect(validateInsForm(C, { ...goodForm, birth: "12" })).toBe("생년월일을 입력해 주세요.");
    expect(validateInsForm(C, { ...goodForm, detail: "a" })).toBe("구체적 내용을 적어 주세요.");
    expect(validateInsForm(C, { ...goodForm, c: [true, true, false] })).toBe("확인 사항에 모두 체크해 주세요.");
    expect(validateInsForm(C, goodForm)).toBe("");
  });

  it("전부 적용이면 사유서가 없고 한 줄 문구만 나온다", () => {
    const C = hourly();
    const html = contractHTML({ ...worker, insForm: goodForm }, C);
    expect(html).not.toContain("미적용 사유서");
    expect(text(html)).toContain("4대 사회보험(고용보험, 산재보험, 국민연금, 건강보험) 적용(가입)을 원칙으로 함");
    expect(validateInsForm(C, null)).toBe("");
  });
});

describe("시나리오 10: 임금지급일·지급방법", () => {
  it("비어 있으면 경고만 나오고 저장은 가능하다", () => {
    const r = checkConfig(hourly());
    expect(r.errors).toEqual([]);
    expect(r.warnings[0]).toContain("임금지급일·지급방법");
    expect(checkConfig(hourly({ payDay: "10", payMethod: "bank" })).warnings).toEqual([]);
  });

  it("직원 이름·임금이 없으면 오류", () => {
    expect(checkConfig(hourly({ label: " " })).errors).toContain("직원 이름(메모)을 입력해 주세요.");
    expect(checkConfig(hourly({ wage: "" })).errors).toContain("임금을 입력해 주세요. 협의가 끝난 뒤 만드세요.");
    const monthly = buildConfig(null, { type: "monthly", label: "x", basePay: "" });
    expect(checkConfig(monthly).errors).toContain("임금을 입력해 주세요. 협의가 끝난 뒤 만드세요.");
  });
});

describe("최저시급 경고", () => {
  it("시급이 최저시급보다 낮으면 경고, 기준값은 인자로 바꿀 수 있다", () => {
    expect(wageCalcSummary(hourly({ wage: "10000" })).warning).toContain("10,320원");
    expect(wageCalcSummary(hourly({ wage: "12000" })).warning).toBeUndefined();
    expect(wageCalcSummary(hourly({ wage: "10500" }), 11000).warning).toContain("11,000원");
  });
});

describe("근로자 입력 검증", () => {
  it("성명 2자, 전화 0으로 시작 9~11자리, 주소 6자 이상", () => {
    expect(validateWorkerInfo({ name: "홍", phone: "010", address: "짧음" }).errors).toEqual({
      name: "이름을 입력해 주세요.",
      phone: "전화번호를 정확히 입력해 주세요.",
      address: "주소를 입력해 주세요. (시/구/동까지)",
    });
    expect(validateWorkerInfo({ name: "홍길동", phone: "031-945-8004", address: "경기 파주시 광탄면" }).ok).toBe(true);
    expect(validateWorkerInfo({ name: "홍길동", phone: "10-1234-5678", address: "경기 파주시 광탄면" }).errors.phone).toBeDefined();
  });
});

describe("안전성과 기본값", () => {
  it("사용자 입력은 HTML로 이스케이프된다", () => {
    const html = contractHTML({ name: '<img src=x onerror="alert(1)">', phone: "<b>", address: "&" }, hourly({ duty: "<script>x</script>" }));
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });

  it("PNG data URL이 아닌 서명 이미지는 무시된다", () => {
    const bad = contractHTML({ sig: 'javascript:alert(1)" onerror="x', ownerSig: "data:image/svg+xml;base64,AAAA" }, hourly());
    expect(bad).not.toContain("javascript:");
    expect(bad).not.toContain("class=\"sg\"");
    const png = "data:image/png;base64,iVBORw0KGgo=";
    expect(contractHTML({ sig: png }, hourly())).toContain('alt="근로자 서명" src="' + png + '"');
  });

  it("사업주 서명은 공통 설정에서 자동으로 들어가고, 제출 건 개별 서명이 우선한다", () => {
    const png = "data:image/png;base64,AAAA";
    const png2 = "data:image/png;base64,BBBB";
    expect(contractHTML({}, hourly({ ownerSig: png }))).toContain('src="' + png + '"');
    expect(contractHTML({ ownerSig: png2 }, hourly({ ownerSig: png }))).toContain('src="' + png2 + '"');
  });

  it("전화번호 기본값은 사이트 설정과 같다 (031-945-8004)", () => {
    expect(DEFAULT_COMPANY.tel).toBe("031-945-8004");
    expect(text(contractHTML({}, hourly()))).toContain("전화 : 031-945-8004");
  });

  it("스냅샷 렌더링: 같은 설정이면 나중에 공통 설정이 바뀌어도 결과가 같다", () => {
    const snapshot = hourly({ biz: "사색찬미한정식", tel: "031-945-8004" });
    const before = contractHTML({ name: "홍길동" }, snapshot);
    const afterGlobalChange = buildConfig({ tel: "000-0000-0000" }, { type: "hourly" }); // 새 설정은 달라도
    expect(afterGlobalChange.tel).toBe("000-0000-0000");
    expect(contractHTML({ name: "홍길동" }, snapshot)).toBe(before);
  });

  it("buildConfig는 호출마다 새 객체를 돌려준다", () => {
    const a = buildConfig();
    a.sched[0].t = "off";
    a.allow[0].n = "x";
    const b = buildConfig();
    expect(b.sched[0].t).toBe("work");
    expect(b.allow[0].n).toBe("");
  });

  it("날짜는 ISO와 한국어 표기 모두 한국어로 표시된다", () => {
    expect(text(contractHTML({}, hourly({ date: "2026-12-01", start: "2026년 10월 23일" })))).toContain("2026년 12월 1일");
    expect(text(contractHTML({}, hourly({ start: "2026년 10월 23일" })))).toContain("근로개시일 : 2026년 10월 23일부터");
  });
});
