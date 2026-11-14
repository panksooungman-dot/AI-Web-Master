import { describe, expect, it } from "vitest";
import { PAGE_H, paginate, safeFileName } from "@/lib/contract/client/export";

const H = PAGE_H - 52 * 2; // 한 쪽에 들어가는 본문 높이

describe("paginate — 계약서 쪽 나누기", () => {
  it("한 쪽에 들어가면 한 쪽", () => {
    expect(paginate(900, [{ top: 300, forced: false }])).toEqual([[0, 900]]);
  });

  it("넘치면 한 쪽에 들어가는 가장 아래쪽 경계에서 자른다", () => {
    const cuts = [200, 600, 1000, 1500].map((top) => ({ top, forced: false }));
    const pages = paginate(2000, cuts);
    expect(pages[0]).toEqual([0, 1000]); // H(1019) 이하인 가장 큰 경계
    expect(pages[1][0]).toBe(1000);
    expect(pages.at(-1)![1]).toBe(2000);
  });

  it("사유서 앞은 한 쪽에 여유가 있어도 반드시 새 쪽", () => {
    const pages = paginate(1500, [{ top: 400, forced: true }, { top: 300, forced: false }]);
    expect(pages[0]).toEqual([0, 400]);
    expect(pages[1][0]).toBe(400);
  });

  it("경계가 없는 아주 긴 덩어리는 어쩔 수 없이 쪽 높이에서 자른다", () => {
    expect(paginate(2500, [])).toEqual([[0, H], [H, 2 * H], [2 * H, 2500]]);
  });

  it("모든 쪽이 이어지고 빠진 구간이 없다", () => {
    const cuts = Array.from({ length: 40 }, (_, i) => ({ top: 80 * (i + 1), forced: i === 25 }));
    const pages = paginate(3300, cuts);
    expect(pages[0][0]).toBe(0);
    pages.forEach((p, i) => i > 0 && expect(p[0]).toBe(pages[i - 1][1]));
    expect(pages.at(-1)![1]).toBe(3300);
    pages.forEach(([a, b]) => expect(b - a).toBeLessThanOrEqual(H));
  });
});

describe("safeFileName", () => {
  it("파일 이름에 쓸 수 없는 글자를 뺀다", () => {
    expect(safeFileName('박/근:로*?"<>|')).toBe("박근로");
    expect(safeFileName("  ")).toBe("계약서");
    expect(safeFileName("가".repeat(100))).toHaveLength(40);
  });
});
