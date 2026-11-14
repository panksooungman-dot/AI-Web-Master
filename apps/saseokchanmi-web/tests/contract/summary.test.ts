import { describe, expect, it } from "vitest";
import { buildConfig, privacyConsent, summarizeContract } from "@/lib/contract";

const val = (rows: { label: string; value: string }[], label: string) => rows.find((r) => r.label === label)?.value;

describe("summarizeContract — 근로자 확인 단계 요약 카드", () => {
  it("시급제: 근무시간·임금·보험을 계약서와 같은 계산으로 보여 준다", () => {
    const C = buildConfig(null, { type: "hourly", wage: "12000", start: "2026-12-01", payDay: "10", payMethod: "bank", ins: { emp: "y", acc: "y", pen: "n", hlt: "n" } });
    const rows = summarizeContract(C);
    expect(val(rows, "고용형태")).toBe("시급제");
    expect(val(rows, "근로 개시일")).toBe("2026년 12월 1일");
    expect(val(rows, "근무 요일")).toBe("매주 5일");
    expect(val(rows, "1주 근로시간")).toBe("40시간");
    expect(val(rows, "임금")).toContain("12,000원");
    expect(val(rows, "임금 지급일")).toBe("매월 10일");
    expect(val(rows, "4대 사회보험")).toBe("가입: 고용보험, 산재보험 / 미적용: 국민연금, 건강보험");
  });

  it("월급제 고정수당이 있으면 표시하고, 요일별 근무표는 근무 요일을 나열한다", () => {
    const C = buildConfig(null, {
      type: "monthly",
      basePay: "2000000",
      allow: [{ n: "식대", a: "200000" }, { n: "", a: "" }, { n: "", a: "" }],
    });
    expect(val(summarizeContract(C), "임금")).toBe("월급 2,200,000원 (고정수당 포함)");
    const P = buildConfig(null, { type: "parttime", wage: "11000" });
    const week = P.sched.map((d, i) => (i === 1 || i === 3 ? { ...d, t: "work" as const, s: "10:00", e: "14:00", bs: "", be: "" } : d));
    const rows = summarizeContract({ ...P, sched: week });
    expect(val(rows, "근무 요일")).toBe("화, 목요일 (요일별 근무표)");
    expect(val(rows, "1주 근로시간")).toBe("8시간");
  });

  it("미정 항목은 지어내지 않고 '별도 협의' 또는 생략한다", () => {
    const rows = summarizeContract(buildConfig(null, { type: "hourly", wage: "12000" }));
    expect(val(rows, "근로 개시일")).toBe("별도 협의");
    expect(val(rows, "임금 지급일")).toBeUndefined();
    expect(val(rows, "지급 방법")).toBeUndefined();
  });
});

describe("privacyConsent 초안", () => {
  it("수집 항목·보유 기간·거부 권리를 모두 포함하고 주민등록번호는 받지 않는다고 밝힌다", () => {
    const items = privacyConsent("사색찬미한정식");
    expect(items.map((i) => i.title)).toEqual(["수집·이용 목적", "수집 항목", "보유·이용 기간", "제3자 제공", "동의 거부 권리"]);
    expect(items[0].body).toContain("사색찬미한정식");
    expect(items[1].body).toContain("주민등록번호는 수집하지 않습니다");
    expect(items[2].body).toContain("3년");
    expect(items[2].body).toContain("분쟁이나 소송이 진행 중이면 그것이 끝날 때까지");
  });
});
