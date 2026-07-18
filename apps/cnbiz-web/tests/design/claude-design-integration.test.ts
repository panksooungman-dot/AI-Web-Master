import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateClaudeDesign, buildDefaultClaudeDesign } from "../../lib/design/claude-design-generator";
import {
  createClaudeDesign,
  getClaudeDesign,
  listClaudeDesigns,
  listClaudeDesignsForPrototype,
} from "../../lib/design/claude-design";
import { createFsStore } from "../../lib/db/fsStore";
import { buildDefaultPrototype } from "../../lib/design/prototype-generator";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";
import type { PrototypeRecord } from "../../lib/design/prototype";
import type { ChatResult } from "../../lib/ai/bridge";

/**
 * Integration coverage for Design Automation Phase 5 (Claude Design Integration), mirroring
 * tests/design/prototype-integration.test.ts's approach for Phase 4.
 *
 * As with Phase 1-4, a route-handler-level integration test (constructing a Request and calling
 * app/api/design/claude/route.ts's POST directly) does NOT work in this repo: that route calls
 * getCurrentActorEmail() → next/headers's cookies(), which throws "cookies was called outside a
 * request scope" unless actually running inside the Next.js server request-handling runtime.
 * Verified against the real dev server via manual curl/Playwright E2E instead. This file
 * integration-tests the layer directly beneath the route: generator + registry working together
 * for real (real filesystem I/O), plus one genuinely end-to-end test through the real CLI
 * subprocess (no mocking).
 */
describe("Design Automation Phase 5 — claude design generator + registry integration", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

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

  const prototype: PrototypeRecord = {
    id: "prototype-riverside",
    wireframeId: wireframe.id,
    planId: plan.id,
    version: 1,
    content: buildDefaultPrototype(wireframe),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-design-integration-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("generates claude design prompts (fake AI success) and persists/retrieves it end-to-end", async () => {
    const aiContent = {
      designPrompt: "Design a warm, inviting cafe website covering Home and Menu.",
      uiPrompt: "Use rustic, warm colors with clear call-to-actions on Home and Menu.",
      componentPrompt: "Design Button and Card components with a consistent rounded style.",
      themePrompt: "Use a warm brown/cream palette with an 8px spacing grid.",
      layoutPrompt: "Lay out Home and Menu responsively across desktop, tablet, and mobile.",
    };

    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(aiContent),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const { content, simulated, provider, model } = await generateClaudeDesign(prototype, fakeChat);
    expect(simulated).toBe(false);

    const record = await createClaudeDesign(
      { prototypeId: prototype.id, planId: prototype.planId, content, simulated, provider, model },
      store
    );

    const fetched = await getClaudeDesign(record.id, store);
    expect(fetched).not.toBeNull();
    expect(fetched?.content).toEqual(aiContent);
    expect(fetched?.provider).toBe("anthropic");
    expect(fetched?.prototypeId).toBe(prototype.id);
    expect(fetched?.planId).toBe(plan.id);

    const listed = await listClaudeDesigns(store);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(record.id);

    const forPrototype = await listClaudeDesignsForPrototype(prototype.id, store);
    expect(forPrototype).toHaveLength(1);
  });

  it("generates claude design prompts (fake AI failure) and persists the deterministic fallback, marked simulated", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "network down" });

    const { content, simulated } = await generateClaudeDesign(prototype, fakeChat);
    expect(simulated).toBe(true);
    expect(content).toEqual(buildDefaultClaudeDesign(prototype));

    const record = await createClaudeDesign(
      { prototypeId: prototype.id, planId: prototype.planId, content, simulated },
      store
    );
    expect((await getClaudeDesign(record.id, store))?.simulated).toBe(true);
  });

  it("regenerating for the same prototype creates a new record rather than overwriting", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const first = await generateClaudeDesign(prototype, fakeChat);
    const second = await generateClaudeDesign(prototype, fakeChat);

    const r1 = await createClaudeDesign({ prototypeId: prototype.id, planId: prototype.planId, ...first }, store);
    const r2 = await createClaudeDesign({ prototypeId: prototype.id, planId: prototype.planId, ...second }, store);

    expect(r1.id).not.toBe(r2.id);
    expect(await listClaudeDesignsForPrototype(prototype.id, store)).toHaveLength(2);
  });

  /**
   * The one genuinely end-to-end test: exercises the REAL default chat function
   * (lib/ai/bridge.ts's chatViaCli(), which shells out to the built CLI), with no mocking/DI.
   * No provider API keys are configured in this environment, so the CLI's own resolve→chat→
   * simulate fallback returns success:true with a non-JSON "[simulated] ..." string as `content`.
   * generateClaudeDesign()'s parseClaudeDesignContent() then fails to parse it and falls back to
   * buildDefaultClaudeDesign() — exactly what the fake-chat-fn tests above already verified in
   * isolation, but here proven through the real CLI subprocess end-to-end.
   */
  it("[real CLI] falls back to the deterministic claude design end-to-end when no provider is configured", async () => {
    const result = await generateClaudeDesign(prototype);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultClaudeDesign(prototype));
  }, 15000);
});
