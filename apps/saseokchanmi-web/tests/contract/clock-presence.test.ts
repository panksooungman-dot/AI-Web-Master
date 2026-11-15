import { describe, expect, it } from "vitest";
import { buildPresence, fmtElapsed, type PresenceInput } from "@/lib/contract/clock-presence";

const NOW = Date.parse("2026-11-15T06:00:00.000Z");
const e = (id: string, name: string, over: Partial<PresenceInput> = {}): PresenceInput => ({ id, name, hasPin: true, status: "out", stale: false, lastAt: null, ...over });

describe("지금 출근 중인 직원 현황", () => {
  it("출근 중인 직원을 먼저 출근한 순으로, 경과 시간과 함께 돌려준다", () => {
    const p = buildPresence(
      [e("b", "김철수", { status: "in", lastAt: "2026-11-15T04:00:00.000Z" }), e("a", "홍길동", { status: "in", lastAt: "2026-11-15T01:00:00.000Z" }), e("c", "이영희", { lastAt: "2026-11-14T09:00:00.000Z" })],
      NOW,
    );
    expect(p.working.map((w) => [w.name, w.elapsedMin])).toEqual([["홍길동", 300], ["김철수", 120]]);
    expect(p.missing).toEqual([]);
    expect(p.total).toBe(3);
  });

  it("퇴근 기록이 빠진 직원은 근무 중이 아니라 별도 목록으로 분리한다", () => {
    const p = buildPresence([e("a", "홍길동", { stale: true, lastAt: "2026-11-13T01:00:00.000Z" })], NOW);
    expect(p.working).toEqual([]);
    expect(p.missing).toEqual([{ id: "a", name: "홍길동", since: "2026-11-13T01:00:00.000Z" }]);
  });

  it("PIN 없는 직원은 출퇴근 가능 인원에서 빠지고, 미래 시각은 경과 0분으로 본다", () => {
    const p = buildPresence([e("a", "홍길동", { hasPin: false }), e("b", "김철수", { status: "in", lastAt: "2026-11-15T06:00:30.000Z" })], NOW);
    expect(p.total).toBe(1);
    expect(p.working[0].elapsedMin).toBe(0);
  });

  it("경과 시간 표기", () => {
    expect(fmtElapsed(0)).toBe("방금 출근");
    expect(fmtElapsed(200)).toBe("3시간 20분째");
  });
});
