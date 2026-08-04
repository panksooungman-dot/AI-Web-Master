import { describe, expect, it } from "vitest";
import { generateTimeline } from "../../lib/timeline/generator";
import type { TimelineInput } from "../../lib/timeline/types";
import type { ChatResult } from "../../lib/ai/bridge";

const BASE_INPUT: TimelineInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  requirements: "감성적인 느낌의 카페 홈페이지를 만들고 싶습니다. 메뉴 소개와 예약 기능이 필요합니다.",
  pageCount: 4,
  featureCount: 2,
  scopeIncluded: ["4개 페이지 디자인", "예약 기능 구현"],
  estimateTimelineWeeks: 3,
};

const VALID_JUDGMENT = {
  overview: "Day 0에 시작해 총 6주 후 종료됩니다.",
  totalDurationWeeks: 6,
  totalDurationDays: 42,
  phases: [
    { name: "기획", description: "요구사항 확정", durationDays: 3, startOffsetDays: 0 },
    { name: "디자인", description: "시안 확정", durationDays: 7, startOffsetDays: 3 },
  ],
  milestones: [{ name: "요구사항 완료", description: "기획 종료", dueOffsetDays: 3 }],
  weeklyPlan: [{ weekNumber: 1, focus: "기획", tasks: ["요구사항 정리"] }],
  assumptions: ["제공된 요구사항 기준 산정"],
};

describe("Timeline Generator — generateTimeline()", () => {
  it("uses the AI-provided judgment (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_JUDGMENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const outcome = await generateTimeline(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.provider).toBe("anthropic");
    expect(outcome.result.overview).toBe(VALID_JUDGMENT.overview);
    expect(outcome.result.totalDurationWeeks).toBe(6);
    expect(outcome.result.totalDurationDays).toBe(42);
    expect(outcome.result.phases).toEqual(VALID_JUDGMENT.phases);
    expect(outcome.result.milestones).toEqual(VALID_JUDGMENT.milestones);
    expect(outcome.result.weeklyPlan).toEqual(VALID_JUDGMENT.weeklyPlan);
  });

  it("falls back to a deterministic timeline (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const outcome = await generateTimeline(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    // 기획/디자인/Frontend/Backend/QA/Deploy/고객 검수 = 7 phases
    expect(outcome.result.phases).toHaveLength(7);
    expect(outcome.result.phases.map((p) => p.name)).toEqual([
      "기획",
      "디자인",
      "Frontend",
      "Backend",
      "QA",
      "Deploy",
      "고객 검수",
    ]);
    // 요구사항 완료/디자인 완료/개발 완료/QA 완료/배포 완료 = 5 milestones
    expect(outcome.result.milestones).toHaveLength(5);
    expect(outcome.result.weeklyPlan.length).toBeGreaterThan(0);
    expect(outcome.result.totalDurationDays).toBeGreaterThan(0);
    expect(outcome.result.totalDurationWeeks).toBeGreaterThanOrEqual(1);
    expect(outcome.result.overview.length).toBeGreaterThan(0);
  });

  it("falls back to a deterministic timeline (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });

    const outcome = await generateTimeline(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    expect(outcome.result.overview.length).toBeGreaterThan(0);
  });

  it("falls back when a required judgment field is missing (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, totalDurationDays: undefined };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateTimeline(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("falls back when phases is empty (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, phases: [] };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateTimeline(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("falls back when milestones is empty (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, milestones: [] };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateTimeline(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("strips a ```json code fence before parsing (same convention as lib/estimates/generator.ts)", async () => {
    const fenced = "```json\n" + JSON.stringify(VALID_JUDGMENT) + "\n```";
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: fenced });

    const outcome = await generateTimeline(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.result.overview).toBe(VALID_JUDGMENT.overview);
  });

  it("scales the deterministic fallback timeline with more pages/features", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const small = await generateTimeline({ ...BASE_INPUT, pageCount: 1, featureCount: 0 }, fakeChat);
    const large = await generateTimeline({ ...BASE_INPUT, pageCount: 7, featureCount: 3 }, fakeChat);

    expect(large.result.totalDurationDays).toBeGreaterThan(small.result.totalDurationDays);
    expect(large.result.totalDurationWeeks).toBeGreaterThanOrEqual(small.result.totalDurationWeeks);
  });

  it("computes phases sequentially with non-overlapping, increasing startOffsetDays", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const outcome = await generateTimeline(BASE_INPUT, fakeChat);
    const { phases } = outcome.result;

    for (let i = 1; i < phases.length; i += 1) {
      const previous = phases[i - 1];
      expect(phases[i].startOffsetDays).toBe(previous.startOffsetDays + previous.durationDays);
    }

    const last = phases[phases.length - 1];
    expect(last.startOffsetDays + last.durationDays).toBe(outcome.result.totalDurationDays);
  });
});
