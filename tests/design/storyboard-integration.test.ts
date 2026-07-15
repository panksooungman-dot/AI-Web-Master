import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateStoryboard, buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { createStoryboard, getStoryboard, listStoryboards, listStoryboardsForPlan } from "../../lib/design/storyboard";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { ChatResult } from "../../lib/ai/bridge";

/**
 * Integration coverage for Design Automation Phase 2 (Storyboard Generator), mirroring
 * tests/design/integration.test.ts's approach for Phase 1.
 *
 * As with Phase 1, a route-handler-level integration test (constructing a Request and calling
 * app/api/design/storyboard/route.ts's POST directly) does NOT work in this repo: that route
 * calls getCurrentActorEmail() → next/headers's cookies(), which throws "cookies was called
 * outside a request scope" unless actually running inside the Next.js server request-handling
 * runtime. Verified against the real dev server via manual curl/Playwright E2E instead. This file
 * integration-tests the layer directly beneath the route: generator + registry working together
 * for real (real filesystem I/O), plus one genuinely end-to-end test through the real CLI
 * subprocess (no mocking).
 */
describe("Design Automation Phase 2 — storyboard generator + registry integration", () => {
  let baseDir: string;

  const planInput: DesignPlanInput = {
    projectName: "Riverside Cafe",
    projectType: "restaurant",
    requirements: "메뉴 소개, 예약, 오시는 길 안내가 필요합니다.",
    targetUsers: "지역 주민",
  };

  const plan: DesignPlanRecord = {
    id: "design-plan-riverside",
    input: planInput,
    content: buildDefaultDesignPlan(planInput),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "storyboard-integration-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("generates a storyboard (fake AI success) and persists/retrieves it end-to-end", async () => {
    const aiContent = {
      screenFlow: [
        { screen: "Home", path: "/", description: "Landing page" },
        { screen: "Menu", path: "/menu", description: "Menu listing" },
      ],
      userJourneys: [
        {
          persona: "Local resident",
          goal: "Reserve a table",
          steps: [
            { step: 1, screen: "Home", goal: "Click Reserve", emotion: "curious" },
            { step: 2, screen: "Menu", goal: "Check the menu", emotion: "interested" },
          ],
        },
      ],
      navigationFlow: [{ from: "Home", to: "Menu", trigger: "Click Menu link" }],
      pageSequence: [
        { order: 1, screen: "Home", path: "/" },
        { order: 2, screen: "Menu", path: "/menu" },
      ],
      screenDescriptions: [
        { screen: "Home", path: "/", purpose: "Introduce the cafe", keyElements: ["Header", "Hero"] },
        { screen: "Menu", path: "/menu", purpose: "List menu items", keyElements: ["Header", "Card"] },
      ],
    };

    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(aiContent),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const { content, simulated, provider, model } = await generateStoryboard(plan, fakeChat);
    expect(simulated).toBe(false);

    const record = createStoryboard({ planId: plan.id, content, simulated, provider, model }, baseDir);

    const fetched = getStoryboard(record.id, baseDir);
    expect(fetched).not.toBeNull();
    expect(fetched?.content).toEqual(aiContent);
    expect(fetched?.provider).toBe("anthropic");
    expect(fetched?.planId).toBe(plan.id);

    const listed = listStoryboards(baseDir);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(record.id);

    const forPlan = listStoryboardsForPlan(plan.id, baseDir);
    expect(forPlan).toHaveLength(1);
  });

  it("generates a storyboard (fake AI failure) and persists the deterministic fallback, marked simulated", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "network down" });

    const { content, simulated } = await generateStoryboard(plan, fakeChat);
    expect(simulated).toBe(true);
    expect(content).toEqual(buildDefaultStoryboard(plan));

    const record = createStoryboard({ planId: plan.id, content, simulated }, baseDir);
    expect(getStoryboard(record.id, baseDir)?.simulated).toBe(true);
  });

  it("keeps storyboards from multiple plans independent in the same registry", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const otherPlanInput: DesignPlanInput = { ...planInput, projectName: "Other Project" };
    const otherPlan: DesignPlanRecord = {
      ...plan,
      id: "design-plan-other",
      input: otherPlanInput,
      content: buildDefaultDesignPlan(otherPlanInput),
    };

    const resultA = await generateStoryboard(plan, fakeChat);
    const resultB = await generateStoryboard(otherPlan, fakeChat);

    createStoryboard({ planId: plan.id, ...resultA }, baseDir);
    createStoryboard({ planId: otherPlan.id, ...resultB }, baseDir);

    expect(listStoryboardsForPlan(plan.id, baseDir)).toHaveLength(1);
    expect(listStoryboardsForPlan(otherPlan.id, baseDir)).toHaveLength(1);
    expect(listStoryboards(baseDir)).toHaveLength(2);
  });

  /**
   * The one genuinely end-to-end test: exercises the REAL default chat function
   * (lib/ai/bridge.ts's chatViaCli(), which shells out to the built CLI), with no mocking/DI.
   * No provider API keys are configured in this environment, so the CLI's own resolve→chat→
   * simulate fallback returns success:true with a non-JSON "[simulated] ..." string as `content`.
   * generateStoryboard()'s parseStoryboardContent() then fails to parse it and falls back to
   * buildDefaultStoryboard() — exactly what the fake-chat-fn tests above already verified in
   * isolation, but here proven through the real CLI subprocess end-to-end.
   */
  it("[real CLI] falls back to the deterministic storyboard end-to-end when no provider is configured", async () => {
    const result = await generateStoryboard(plan);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultStoryboard(plan));
  }, 15000);
});
