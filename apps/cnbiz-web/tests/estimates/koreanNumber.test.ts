import { describe, expect, it } from "vitest";
import { toKoreanAmountPhrase } from "../../lib/estimates/koreanNumber";

describe("toKoreanAmountPhrase() — lib/estimates/koreanNumber.ts", () => {
  it("converts round amounts to the standard 견적서 Korean phrase", () => {
    expect(toKoreanAmountPhrase(0)).toBe("일금 영원");
    expect(toKoreanAmountPhrase(1_000_000)).toBe("일금 백만원");
    expect(toKoreanAmountPhrase(10_000)).toBe("일금 일만원");
    expect(toKoreanAmountPhrase(100_000_000)).toBe("일금 일억원");
  });

  it("converts mixed-digit amounts across unit groups", () => {
    expect(toKoreanAmountPhrase(21_750_000)).toBe("일금 이천백칠십오만원");
    expect(toKoreanAmountPhrase(1_234_567)).toBe("일금 백이십삼만사천오백육십칠원");
  });

  it("rounds non-integer amounts and treats negative amounts as zero", () => {
    expect(toKoreanAmountPhrase(999_999.6)).toBe("일금 백만원");
    expect(toKoreanAmountPhrase(-5000)).toBe("일금 영원");
  });
});
