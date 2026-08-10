import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { runDesignChainOrchestration } from "../../lib/design/design-chain-orchestrator";
import type { DesignPlanInput } from "../../lib/design/types";
import type { ChatResult } from "../../lib/ai/bridge";

const INPUT: DesignPlanInput = {
  projectName: "Acme Hospital",
  projectType: "hospital",
  requirements: "환자가 진료과목별로 예약을 남기고 관리자가 확인하는 병원 홈페이지",
  targetUsers: "지역 주민, 30~60대",
};

/** Provider가 항상 실패하는 것으로 시뮬레이션 — 모든 단계가 결정론적 buildDefault*() 폴백을 타도록
 *  강제해, 실제 AI 호출(비용·네트워크·비결정성) 없이 체이닝 로직 자체만 검증한다. */
const FAILING_CHAT_FN = async (): Promise<ChatResult> => ({ success: false, error: "no provider configured" });

describe("Design Automation — Chain A Orchestrator (lib/design/design-chain-orchestrator.ts)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "design-chain-orchestrator-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("runs Requirements through Claude Design and starts a Review, chaining each id into the next stage's foreign key", async () => {
    const result = await runDesignChainOrchestration(INPUT, store, FAILING_CHAT_FN);

    expect(result.planId).toBe(result.designPlan.id);
    expect(result.storyboard.planId).toBe(result.designPlan.id);
    expect(result.wireframe.storyboardId).toBe(result.storyboard.id);
    expect(result.wireframe.planId).toBe(result.designPlan.id);
    expect(result.prototype.wireframeId).toBe(result.wireframe.id);
    expect(result.prototype.planId).toBe(result.designPlan.id);
    expect(result.claudeDesign.prototypeId).toBe(result.prototype.id);
    expect(result.claudeDesign.planId).toBe(result.designPlan.id);
    expect(result.review.claudeDesignId).toBe(result.claudeDesign.id);
    expect(result.review.planId).toBe(result.designPlan.id);

    // 모든 산출물이 실제로 비어있지 않다
    expect(result.storyboard.content.screenFlow.length).toBeGreaterThan(0);
    expect(result.wireframe.content.layouts.length).toBeGreaterThan(0);
    expect(result.prototype.content.screens.length).toBeGreaterThan(0);
    expect(result.claudeDesign.content.designPrompt.length).toBeGreaterThan(0);

    // Review는 항상 "in_review" — 승인은 이 오케스트레이터가 대신하지 않는다
    expect(result.review.status).toBe("in_review");
    expect(result.review.history).toHaveLength(1);
    expect(result.review.history[0].status).toBe("in_review");

    // 전 구간이 폴백을 탔으므로 simulated 플래그가 그대로 반영되어야 한다
    expect(result.designPlan.simulated).toBe(true);
    expect(result.claudeDesign.simulated).toBe(true);
  });

  it("records the actor passed in on the Review's creation history entry", async () => {
    const result = await runDesignChainOrchestration(INPUT, store, FAILING_CHAT_FN, "pm@example.com");

    expect(result.review.history[0].actor).toBe("pm@example.com");
  });

  it("persists every stage's record to its own collection so it is independently retrievable later", async () => {
    const result = await runDesignChainOrchestration(INPUT, store, FAILING_CHAT_FN);

    const files = [
      "design-plans.json",
      "design-storyboards.json",
      "design-wireframes.json",
      "design-prototypes.json",
      "design-claude.json",
      "design-reviews.json",
    ];

    for (const file of files) {
      const raw = fs.readFileSync(path.join(baseDir, file), "utf-8");
      expect(JSON.parse(raw)).toHaveLength(1);
    }

    expect(result.planId).toBeTruthy();
  });

  it("starting a second review on the same Claude Design auto-increments its version", async () => {
    const first = await runDesignChainOrchestration(INPUT, store, FAILING_CHAT_FN);
    const second = await runDesignChainOrchestration(INPUT, store, FAILING_CHAT_FN);

    // 서로 다른 Claude Design에서 시작했으므로 각자 v1
    expect(first.review.version).toBe(1);
    expect(second.review.version).toBe(1);
    expect(second.claudeDesign.id).not.toBe(first.claudeDesign.id);
  });
});
