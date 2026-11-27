import { describe, expect, it } from "vitest";
import { DEFAULT_EXCLUDED, depositKey, isExcludedDepositor, parseExcludeNames, parseNhSms } from "@/lib/contract/deposit";

// 2026-11-26 19:31 한국 시간 = 10:31 UTC
const NOW = new Date("2026-11-26T10:31:00.000Z");

describe("농협 입금 문자 해석", () => {
  it("실제 입금 문자(줄바꿈 형식)에서 금액·입금자명·시각을 뽑는다", () => {
    const sms = "[Web발신]\n알림\n농협 입금1,000원\n11/26 19:30\n301-****-4369-51\n박성만";
    expect(parseNhSms(sms, NOW)).toEqual({ kind: "deposit", amount: 1000, depositor: "박성만", occurredAt: "2026-11-26T10:30:00.000Z" });
  });

  it("줄바꿈 없이 공백으로 이어져 와도 같은 결과이고, 천 단위 금액·여러 단어 입금자명도 읽는다", () => {
    expect(parseNhSms("농협 입금1,234,500원 11/26 19:30 301-****-4369-51 김 철수", NOW)).toEqual({ kind: "deposit", amount: 1234500, depositor: "김 철수", occurredAt: "2026-11-26T10:30:00.000Z" });
  });

  it("입금자명은 첫 줄만 쓰고 30자로 제한한다(뒤에 다른 안내가 붙어도 섞이지 않는다)", () => {
    const r = parseNhSms("농협 입금5,000원\n11/26 19:30\n301-****-4369-51\n홍길동\n잔액 1,000,000원", NOW);
    expect(r).toMatchObject({ kind: "deposit", depositor: "홍길동" });
    const long = parseNhSms(`농협 입금5,000원\n11/26 19:30\n301-****-4369-51\n${"가".repeat(50)}`, NOW);
    expect(long.kind === "deposit" && long.depositor.length).toBe(30);
  });

  it("앱 푸시 알림(입금자명 뒤에 잔액이 붙고 제목이 앞에 붙음)도 같은 입금으로 읽고, 잔액은 버린다", () => {
    const push = "입출금 알림\n농협 입금1,000원\n11/27 13:28 301-****-4369-51\n박성만 잔액24,494,014원";
    expect(parseNhSms(push, new Date("2026-11-27T04:30:00.000Z"))).toEqual({ kind: "deposit", amount: 1000, depositor: "박성만", occurredAt: "2026-11-27T04:28:00.000Z" });
    // 한 줄로 이어져 와도 같다
    expect(parseNhSms("농협 입금1,000원 11/27 13:28 301-****-4369-51 박성만 잔액24,494,014원", new Date("2026-11-27T04:30:00.000Z"))).toMatchObject({ kind: "deposit", depositor: "박성만" });
    // 같은 입금의 문자와 푸시는 같은 키가 되어 한 번만 저장된다
    const sms = parseNhSms("농협 입금1,000원\n11/27 13:28\n301-****-4369-51\n박성만", new Date("2026-11-27T04:35:00.000Z"));
    const pu = parseNhSms(push, new Date("2026-11-27T04:30:00.000Z"));
    expect(sms.kind === "deposit" && pu.kind === "deposit" && depositKey(sms)).toBe(pu.kind === "deposit" ? depositKey(pu) : null);
  });

  it("출금 문자는 저장하지 않는다", () => {
    expect(parseNhSms("농협 출금28,380원\n11/26 19:16\n301-****-4369-51\n파주농협", NOW)).toEqual({ kind: "withdrawal" });
  });

  it("입금·출금과 상관없는 문자는 무시한다", () => {
    expect(parseNhSms("[NH농협] 인증번호 123456", NOW)).toEqual({ kind: "ignored" });
    expect(parseNhSms("", NOW)).toEqual({ kind: "ignored" });
  });

  it("입금 문자 같지만 형식을 읽지 못하면 해석 실패로 돌려준다(놓치지 않기 위해)", () => {
    expect(parseNhSms("농협 입금1,000원 확인바랍니다", NOW)).toEqual({ kind: "unparsed" });
    expect(parseNhSms("다른은행 입금 5,000원", NOW)).toEqual({ kind: "unparsed" });
    expect(parseNhSms("농협 입금1,000원\n11/26 19:30\n301-****-4369-51", NOW)).toEqual({ kind: "unparsed" }); // 입금자명 없음
    expect(parseNhSms("농협 입금0원\n11/26 19:30\n301-****-4369-51\n박성만", NOW)).toEqual({ kind: "unparsed" });
  });

  it("없는 날짜·시각은 읽지 못한 것으로 본다", () => {
    for (const bad of ["13/26 19:30", "11/31 19:30", "2/30 19:30", "11/26 25:30", "11/26 19:61", "0/26 19:30"]) {
      expect(parseNhSms(`농협 입금1,000원\n${bad}\n301-****-4369-51\n박성만`, NOW)).toEqual({ kind: "unparsed" });
    }
  });

  it("연도가 없는 문자는 받은 시각 기준으로 채우고, 연말 입금이 연초에 도착하면 지난해로 본다", () => {
    const jan = new Date("2027-01-01T00:10:00.000Z"); // 한국 시간 1/1 09:10
    expect(parseNhSms("농협 입금1,000원\n12/31 23:50\n301-****-4369-51\n박성만", jan)).toMatchObject({ kind: "deposit", occurredAt: "2026-12-31T14:50:00.000Z" });
    expect(parseNhSms("농협 입금1,000원\n01/01 09:05\n301-****-4369-51\n박성만", jan)).toMatchObject({ kind: "deposit", occurredAt: "2027-01-01T00:05:00.000Z" });
  });

  it("같은 입금은 같은 키를 갖고, 해석 실패 건은 키가 없다", () => {
    const r = { occurredAt: "2026-11-26T10:30:00.000Z", amount: 1000, depositor: "박성만" };
    expect(depositKey(r)).toBe(depositKey({ ...r }));
    expect(depositKey({ ...r, amount: 2000 })).not.toBe(depositKey(r));
    expect(depositKey({ ...r, unparsed: true })).toBeNull();
  });
});

describe("카드사 입금 제외", () => {
  it('입금자명에 "카드"가 들어가면 제외한다', () => {
    expect(DEFAULT_EXCLUDED).toContain("카드");
    for (const n of ["삼성카드", "비씨카드", "KB국민카드", "NH농협카드", "신한 카드", "(주)롯데카드"]) expect(isExcludedDepositor(n)).toBe(true);
    for (const n of ["박성만", "김철수", "홍길동"]) expect(isExcludedDepositor(n)).toBe(false);
  });

  it("사장님이 추가한 이름도 제외하고, 공백·대소문자는 무시한다", () => {
    expect(isExcludedDepositor("나이스정보통신", [])).toBe(false);
    expect(isExcludedDepositor("나이스정보통신", ["나이스"])).toBe(true);
    expect(isExcludedDepositor("KIS 정보통신", ["kis정보"])).toBe(true);
    expect(isExcludedDepositor("박성만", ["  "])).toBe(false); // 빈 제외어는 모든 이름을 걸러 버리지 않는다
  });

  it("제외 이름 목록은 정리해서 받고, 잘못된 값은 거부한다", () => {
    expect(parseExcludeNames([" 나이스 ", "나이스", "", "KIS  정보"])).toEqual({ ok: true, value: ["나이스", "KIS 정보"] });
    expect(parseExcludeNames("나이스")).toMatchObject({ ok: false });
    expect(parseExcludeNames([1])).toMatchObject({ ok: false });
    expect(parseExcludeNames(["가".repeat(31)])).toMatchObject({ ok: false });
    expect(parseExcludeNames(Array.from({ length: 31 }, (_, i) => `이름${i}`))).toMatchObject({ ok: false });
  });
});
