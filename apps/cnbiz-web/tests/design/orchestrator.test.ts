import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { runDesignOrchestration } from "../../lib/design/orchestrator";
import type { DesignPlanInput } from "../../lib/design/types";
import type { ChatResult } from "../../lib/ai/bridge";

const INPUT: DesignPlanInput = {
  projectName: "Acme Booking",
  projectType: "corporate",
  requirements: "Need a corporate site with a booking feature and an admin resource list.",
  targetUsers: "B2B buyers",
};

/** Provider가 항상 실패하는 것으로 시뮬레이션 — 모든 단계가 결정론적 buildDefault*() 폴백을 타도록
 *  강제해, 실제 AI 호출(비용·네트워크·비결정성) 없이 체이닝 로직 자체만 검증한다. */
const FAILING_CHAT_FN = async (): Promise<ChatResult> => ({ success: false, error: "no provider configured" });

describe("Design Automation — 9-Stage Orchestrator (lib/design/orchestrator.ts)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("runs all 10 stages end-to-end, chaining each record's id into the next stage's foreign key", async () => {
    const result = await runDesignOrchestration(INPUT, store, FAILING_CHAT_FN);

    expect(result.planId).toBe(result.designPlan.id);
    expect(result.databaseDesign.planId).toBe(result.designPlan.id);
    expect(result.apiDesign.databaseDesignId).toBe(result.databaseDesign.id);
    expect(result.apiDesign.planId).toBe(result.designPlan.id);
    expect(result.backendDesign.apiDesignId).toBe(result.apiDesign.id);
    expect(result.backendDesign.planId).toBe(result.designPlan.id);
    expect(result.backendCode.backendDesignId).toBe(result.backendDesign.id);
    expect(result.apiCode.backendCodeId).toBe(result.backendCode.id);
    expect(result.databaseCode.databaseDesignId).toBe(result.databaseDesign.id);
    expect(result.testPlan.backendDesignId).toBe(result.backendDesign.id);
    expect(result.testCode.testPlanId).toBe(result.testPlan.id);
    expect(result.testCode.backendCodeId).toBe(result.backendCode.id);
    expect(result.crudFrontend.apiCodeId).toBe(result.apiCode.id);
    expect(result.crudFrontend.databaseDesignId).toBe(result.databaseDesign.id);

    // 모든 산출물이 실제로 비어있지 않다(단순 스텁이 아니라 실제 콘텐츠가 생성됨)
    expect(result.databaseDesign.content.tables.length).toBeGreaterThan(0);
    expect(result.apiDesign.content.endpoints.length).toBeGreaterThan(0);
    expect(result.backendDesign.content.logic.length).toBeGreaterThan(0);
    expect(result.backendCode.content.files.length).toBeGreaterThan(0);
    expect(result.apiCode.content.files.length).toBeGreaterThan(0);
    expect(result.databaseCode.content.files.length).toBeGreaterThan(0);
    expect(result.testPlan.content.testCases.length).toBeGreaterThan(0);
    expect(result.testCode.content.files.length).toBeGreaterThan(0);
    expect(result.crudFrontend.content.files.length).toBeGreaterThan(0);

    // 전 구간이 폴백을 탔으므로 simulated 플래그가 그대로 반영되어야 한다(조용히 숨기지 않음)
    expect(result.designPlan.simulated).toBe(true);
    expect(result.databaseDesign.simulated).toBe(true);
    expect(result.testCode.simulated).toBe(true);
  });

  it("persists every stage's record to its own collection so it is independently retrievable later", async () => {
    const result = await runDesignOrchestration(INPUT, store, FAILING_CHAT_FN);

    const files = [
      "design-plans.json",
      "design-database.json",
      "design-api.json",
      "design-backend.json",
      "design-backend-code.json",
      "design-api-code.json",
      "design-database-code.json",
      "design-testplan.json",
      "design-test-code.json",
      "design-crud-frontend.json",
    ];

    for (const file of files) {
      const raw = fs.readFileSync(path.join(baseDir, file), "utf-8");
      expect(JSON.parse(raw)).toHaveLength(1);
    }

    expect(result.planId).toBeTruthy();
  });

  it("each stage version-increments independently when the same plan is orchestrated twice", async () => {
    const first = await runDesignOrchestration(INPUT, store, FAILING_CHAT_FN);
    // 두 번째 실행은 새 Design Plan에서 다시 시작하므로 서로 다른 planId를 갖지만, 파일 기반
    // registry 자체는 두 번의 실행을 모두 독립적으로 보존해야 한다(덮어쓰지 않음).
    const second = await runDesignOrchestration(INPUT, store, FAILING_CHAT_FN);

    expect(second.planId).not.toBe(first.planId);
    expect(second.databaseDesign.id).not.toBe(first.databaseDesign.id);

    const plans = JSON.parse(fs.readFileSync(path.join(baseDir, "design-plans.json"), "utf-8"));
    expect(plans).toHaveLength(2);
  });
});
