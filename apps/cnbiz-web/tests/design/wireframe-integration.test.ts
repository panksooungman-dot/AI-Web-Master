import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateWireframe, buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import {
  createWireframe,
  getWireframe,
  listWireframes,
  listWireframesForStoryboard,
} from "../../lib/design/wireframe";
import { createFsStore } from "../../lib/db/fsStore";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { ChatResult } from "../../lib/ai/bridge";

/**
 * Integration coverage for Design Automation Phase 3 (Wireframe Generator), mirroring
 * tests/design/storyboard-integration.test.ts's approach for Phase 2.
 *
 * As with Phase 1/2, a route-handler-level integration test (constructing a Request and calling
 * app/api/design/wireframe/route.ts's POST directly) does NOT work in this repo: that route calls
 * getCurrentActorEmail() → next/headers's cookies(), which throws "cookies was called outside a
 * request scope" unless actually running inside the Next.js server request-handling runtime.
 * Verified against the real dev server via manual curl/Playwright E2E instead. This file
 * integration-tests the layer directly beneath the route: generator + registry working together
 * for real (real filesystem I/O), plus one genuinely end-to-end test through the real CLI
 * subprocess (no mocking).
 */
describe("Design Automation Phase 3 — wireframe generator + registry integration", () => {
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

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "wireframe-integration-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("generates a wireframe (fake AI success) and persists/retrieves it end-to-end", async () => {
    const aiContent = {
      layouts: [
        {
          screen: "Home",
          path: "/",
          desktop: {
            breakpoint: "desktop",
            columns: 12,
            sections: [{ name: "Header", components: ["Header"], description: "Top header" }],
          },
          tablet: {
            breakpoint: "tablet",
            columns: 8,
            sections: [{ name: "Header", components: ["Header"], description: "Top header" }],
          },
          mobile: {
            breakpoint: "mobile",
            columns: 4,
            sections: [{ name: "Header", components: ["Header"], description: "Top header" }],
          },
        },
      ],
      components: [{ type: "Header", usedIn: ["Home"], notes: "Top header" }],
      responsive: {
        desktop: { breakpoint: "desktop", minWidth: 1024, columns: 12, notes: "full grid" },
        tablet: { breakpoint: "tablet", minWidth: 640, columns: 8, notes: "2 column grid" },
        mobile: { breakpoint: "mobile", minWidth: 0, columns: 4, notes: "1 column stack" },
      },
    };

    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(aiContent),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const { content, simulated, provider, model } = await generateWireframe(storyboard, fakeChat);
    expect(simulated).toBe(false);

    const record = await createWireframe(
      { storyboardId: storyboard.id, planId: storyboard.planId, content, simulated, provider, model },
      store
    );

    const fetched = await getWireframe(record.id, store);
    expect(fetched).not.toBeNull();
    expect(fetched?.content).toEqual(aiContent);
    expect(fetched?.provider).toBe("anthropic");
    expect(fetched?.storyboardId).toBe(storyboard.id);
    expect(fetched?.planId).toBe(plan.id);

    const listed = await listWireframes(store);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(record.id);

    const forStoryboard = await listWireframesForStoryboard(storyboard.id, store);
    expect(forStoryboard).toHaveLength(1);
  });

  it("generates a wireframe (fake AI failure) and persists the deterministic fallback, marked simulated", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "network down" });

    const { content, simulated } = await generateWireframe(storyboard, fakeChat);
    expect(simulated).toBe(true);
    expect(content).toEqual(buildDefaultWireframe(storyboard));

    const record = await createWireframe({ storyboardId: storyboard.id, planId: storyboard.planId, content, simulated }, store);
    expect((await getWireframe(record.id, store))?.simulated).toBe(true);
  });

  it("keeps wireframes from multiple storyboards independent in the same registry", async () => {
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

    const resultA = await generateWireframe(storyboard, fakeChat);
    const resultB = await generateWireframe(otherStoryboard, fakeChat);

    await createWireframe({ storyboardId: storyboard.id, planId: storyboard.planId, ...resultA }, store);
    await createWireframe({ storyboardId: otherStoryboard.id, planId: otherStoryboard.planId, ...resultB }, store);

    expect(await listWireframesForStoryboard(storyboard.id, store)).toHaveLength(1);
    expect(await listWireframesForStoryboard(otherStoryboard.id, store)).toHaveLength(1);
    expect(await listWireframes(store)).toHaveLength(2);
  });

  /**
   * The one genuinely end-to-end test: exercises the REAL default chat function
   * (lib/ai/bridge.ts's chatViaCli(), which shells out to the built CLI), with no mocking/DI.
   * No provider API keys are configured in this environment, so the CLI's own resolve→chat→
   * simulate fallback returns success:true with a non-JSON "[simulated] ..." string as `content`.
   * generateWireframe()'s parseWireframeContent() then fails to parse it and falls back to
   * buildDefaultWireframe() — exactly what the fake-chat-fn tests above already verified in
   * isolation, but here proven through the real CLI subprocess end-to-end.
   */
  it("[real CLI] falls back to the deterministic wireframe end-to-end when no provider is configured", async () => {
    const result = await generateWireframe(storyboard);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultWireframe(storyboard));
  }, 15000);
});
