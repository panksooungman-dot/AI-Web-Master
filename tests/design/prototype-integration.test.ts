import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generatePrototype, buildDefaultPrototype } from "../../lib/design/prototype-generator";
import {
  createPrototype,
  getPrototype,
  listPrototypes,
  listPrototypesForWireframe,
} from "../../lib/design/prototype";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";
import type { ChatResult } from "../../lib/ai/bridge";

/**
 * Integration coverage for Design Automation Phase 4 (Prototype Generator), mirroring
 * tests/design/wireframe-integration.test.ts's approach for Phase 3.
 *
 * As with Phase 1/2/3, a route-handler-level integration test (constructing a Request and calling
 * app/api/design/prototype/route.ts's POST directly) does NOT work in this repo: that route calls
 * getCurrentActorEmail() → next/headers's cookies(), which throws "cookies was called outside a
 * request scope" unless actually running inside the Next.js server request-handling runtime.
 * Verified against the real dev server via manual curl/Playwright E2E instead. This file
 * integration-tests the layer directly beneath the route: generator + registry working together
 * for real (real filesystem I/O), plus one genuinely end-to-end test through the real CLI
 * subprocess (no mocking).
 */
describe("Design Automation Phase 4 — prototype generator + registry integration", () => {
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

  const storyboard: StoryboardRecord = {
    id: "storyboard-riverside",
    planId: plan.id,
    content: buildDefaultStoryboard(plan),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  const wireframe: WireframeRecord = {
    id: "wireframe-riverside",
    storyboardId: storyboard.id,
    planId: plan.id,
    content: buildDefaultWireframe(storyboard),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "prototype-integration-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("generates a prototype (fake AI success) and persists/retrieves it end-to-end", async () => {
    const aiContent = {
      screens: [
        { screen: "Home", path: "/" },
        { screen: "Menu", path: "/menu" },
      ],
      clickFlows: [
        {
          name: "Primary Flow",
          steps: [
            { step: 1, screen: "Home", element: "Button", action: "Click", leadsTo: "Menu" },
            { step: 2, screen: "Menu", element: "Card", action: "Click", leadsTo: "Complete" },
          ],
        },
      ],
      navigationFlow: [{ from: "Home", to: "Menu", trigger: "Click Menu link" }],
      screenTransitions: [{ from: "Home", to: "Menu", type: "slide-left", durationMs: 300 }],
      interactionMap: [
        { screen: "Home", interactions: [{ element: "Button", trigger: "click", result: "Navigate to Menu" }] },
        { screen: "Menu", interactions: [{ element: "Card", trigger: "click", result: "Show item detail" }] },
      ],
      componentActions: [
        { component: "Button", action: "Trigger Action", description: "Navigate to Menu" },
        { component: "Card", action: "Navigate to Detail", description: "Show item detail" },
      ],
      userJourneys: [
        {
          persona: "Local resident",
          goal: "Browse the menu",
          steps: [
            { step: 1, screen: "Home", action: "Click Menu", emotion: "curious" },
            { step: 2, screen: "Menu", action: "Browse items", emotion: "interested" },
          ],
        },
      ],
      animationPreviews: [
        { screen: "Home", animation: "Fade in", trigger: "onLoad", durationMs: 400 },
        { screen: "Menu", animation: "Card lift on hover", trigger: "onHover", durationMs: 150 },
      ],
      preview: { startScreen: "Home", totalScreens: 2, totalInteractions: 2, summary: "2-screen prototype" },
    };

    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(aiContent),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const { content, simulated, provider, model } = await generatePrototype(wireframe, fakeChat);
    expect(simulated).toBe(false);

    const record = createPrototype(
      { wireframeId: wireframe.id, planId: wireframe.planId, content, simulated, provider, model },
      baseDir
    );

    const fetched = getPrototype(record.id, baseDir);
    expect(fetched).not.toBeNull();
    expect(fetched?.content).toEqual(aiContent);
    expect(fetched?.provider).toBe("anthropic");
    expect(fetched?.wireframeId).toBe(wireframe.id);
    expect(fetched?.planId).toBe(plan.id);
    expect(fetched?.version).toBe(1);

    const listed = listPrototypes(baseDir);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(record.id);

    const forWireframe = listPrototypesForWireframe(wireframe.id, baseDir);
    expect(forWireframe).toHaveLength(1);
  });

  it("generates a prototype (fake AI failure) and persists the deterministic fallback, marked simulated", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "network down" });

    const { content, simulated } = await generatePrototype(wireframe, fakeChat);
    expect(simulated).toBe(true);
    expect(content).toEqual(buildDefaultPrototype(wireframe));

    const record = createPrototype({ wireframeId: wireframe.id, planId: wireframe.planId, content, simulated }, baseDir);
    expect(getPrototype(record.id, baseDir)?.simulated).toBe(true);
  });

  it("regenerating for the same wireframe creates a new version rather than overwriting", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const first = await generatePrototype(wireframe, fakeChat);
    const second = await generatePrototype(wireframe, fakeChat);

    const v1 = createPrototype({ wireframeId: wireframe.id, planId: wireframe.planId, ...first }, baseDir);
    const v2 = createPrototype({ wireframeId: wireframe.id, planId: wireframe.planId, ...second }, baseDir);

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(listPrototypesForWireframe(wireframe.id, baseDir)).toHaveLength(2);
  });

  it("keeps prototypes from multiple wireframes independent in the same registry", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const otherPlanInput: DesignPlanInput = { ...planInput, projectName: "Other Project" };
    const otherPlan: DesignPlanRecord = {
      ...plan,
      id: "design-plan-other",
      input: otherPlanInput,
      content: buildDefaultDesignPlan(otherPlanInput),
    };
    const otherStoryboard: StoryboardRecord = {
      ...storyboard,
      id: "storyboard-other",
      planId: otherPlan.id,
      content: buildDefaultStoryboard(otherPlan),
    };
    const otherWireframe: WireframeRecord = {
      ...wireframe,
      id: "wireframe-other",
      storyboardId: otherStoryboard.id,
      planId: otherPlan.id,
      content: buildDefaultWireframe(otherStoryboard),
    };

    const resultA = await generatePrototype(wireframe, fakeChat);
    const resultB = await generatePrototype(otherWireframe, fakeChat);

    createPrototype({ wireframeId: wireframe.id, planId: wireframe.planId, ...resultA }, baseDir);
    createPrototype({ wireframeId: otherWireframe.id, planId: otherWireframe.planId, ...resultB }, baseDir);

    expect(listPrototypesForWireframe(wireframe.id, baseDir)).toHaveLength(1);
    expect(listPrototypesForWireframe(otherWireframe.id, baseDir)).toHaveLength(1);
    expect(listPrototypes(baseDir)).toHaveLength(2);
  });

  /**
   * The one genuinely end-to-end test: exercises the REAL default chat function
   * (lib/ai/bridge.ts's chatViaCli(), which shells out to the built CLI), with no mocking/DI.
   * No provider API keys are configured in this environment, so the CLI's own resolve→chat→
   * simulate fallback returns success:true with a non-JSON "[simulated] ..." string as `content`.
   * generatePrototype()'s parsePrototypeContent() then fails to parse it and falls back to
   * buildDefaultPrototype() — exactly what the fake-chat-fn tests above already verified in
   * isolation, but here proven through the real CLI subprocess end-to-end.
   */
  it("[real CLI] falls back to the deterministic prototype end-to-end when no provider is configured", async () => {
    const result = await generatePrototype(wireframe);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultPrototype(wireframe));
  }, 15000);
});
