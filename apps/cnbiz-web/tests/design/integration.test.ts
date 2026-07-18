import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateDesignPlan, buildDefaultDesignPlan } from "../../lib/design/generator";
import { createDesignPlan, getDesignPlan, listDesignPlans } from "../../lib/design/registry";
import { createFsStore } from "../../lib/db/fsStore";
import type { DesignPlanInput } from "../../lib/design/types";
import type { ChatResult } from "../../lib/ai/bridge";

/**
 * Integration coverage for Design Automation Phase 1.
 *
 * A true HTTP/route-handler-level integration test (constructing a Request and calling
 * `app/api/design/requirements/route.ts`'s POST directly) was attempted and does NOT work in
 * this repo: that route calls `getCurrentActorEmail()` → `next/headers`'s `cookies()`, which
 * throws "cookies was called outside a request scope" unless it's actually running inside the
 * Next.js server request-handling runtime. No other route in this repository is unit-tested
 * that way either, for the same reason — verified against the real Next.js dev server via
 * manual curl E2E instead (see docs/01_PMO/CHANGELOG.md and docs/03_DESIGN/DESIGN_AUTOMATION_MASTER.md).
 * This file instead integration-tests the layer directly beneath the route: generator + registry
 * working together for real (real filesystem I/O, no mocked module boundaries) — exactly what
 * the route handler itself does before/after the auth-only `cookies()` call.
 */
describe("Design Automation Phase 1 — generator + registry integration", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "design-integration-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  const input: DesignPlanInput = {
    projectName: "Riverside Cafe",
    projectType: "restaurant",
    requirements: "메뉴 소개, 예약, 오시는 길 안내가 필요합니다.",
    targetUsers: "지역 주민",
  };

  it("generates a plan (fake AI success) and persists/retrieves it end-to-end", async () => {
    const aiContent = {
      requirementAnalysis: {
        projectSummary: "Riverside Cafe is a restaurant site.",
        functionalRequirements: ["Menu page", "Reservation form"],
        nonFunctionalRequirements: ["Responsive layout"],
        businessRules: ["No online payment in v1"],
        targetUsers: ["Local residents"],
      },
      featureList: [{ name: "Reservation", description: "Book a table online", priority: "High" as const }],
      siteMap: [{ path: "/", title: "Home" }, { path: "/menu", title: "Menu" }],
      userFlows: [
        {
          name: "Reservation Flow",
          steps: [
            { step: 1, screen: "Home", action: "Click Reserve", next: "Reservation Form" },
            { step: 2, screen: "Reservation Form", action: "Submit", next: "Complete" },
          ],
        },
      ],
      screenList: [
        { name: "Home", path: "/", description: "Landing page", components: ["Header", "Hero"] },
        { name: "Menu", path: "/menu", description: "Menu listing", components: ["Header", "Card"] },
      ],
    };

    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(aiContent),
      provider: "anthropic",
      model: "claude-sonnet-5",
      usage: { inputTokens: 100, outputTokens: 200 },
    });

    const { content, simulated, provider, model } = await generateDesignPlan(input, fakeChat);
    expect(simulated).toBe(false);

    const record = await createDesignPlan({ input, content, simulated, provider, model }, store);

    // Round-trips through the real fs-backed registry.
    const fetched = await getDesignPlan(record.id, store);
    expect(fetched).not.toBeNull();
    expect(fetched?.content).toEqual(aiContent);
    expect(fetched?.provider).toBe("anthropic");

    const listed = await listDesignPlans(store);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(record.id);
  });

  it("generates a plan (fake AI failure) and persists the deterministic fallback, marked simulated", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "network down" });

    const { content, simulated } = await generateDesignPlan(input, fakeChat);
    expect(simulated).toBe(true);
    expect(content).toEqual(buildDefaultDesignPlan(input));

    const record = await createDesignPlan({ input, content, simulated }, store);
    expect((await getDesignPlan(record.id, store))?.simulated).toBe(true);
  });

  it("keeps plans from multiple projects independent in the same registry", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const planA = await generateDesignPlan({ ...input, projectName: "Project A" }, fakeChat);
    const planB = await generateDesignPlan({ ...input, projectName: "Project B" }, fakeChat);

    await createDesignPlan({ input: { ...input, projectName: "Project A" }, ...planA }, store);
    await createDesignPlan({ input: { ...input, projectName: "Project B" }, ...planB }, store);

    const plans = await listDesignPlans(store);
    expect(plans.map((p) => p.input.projectName).sort()).toEqual(["Project A", "Project B"]);
  });

  /**
   * The one genuinely end-to-end test: exercises the REAL default chat function
   * (lib/ai/bridge.ts's chatViaCli(), which shells out to the built CLI), with no mocking/DI.
   * This environment has no provider API keys configured, so the CLI's own resolve→chat→simulate
   * fallback (packages/cli/src/providers/manager.ts) returns success:true with a human-readable
   * "[simulated] ... no LLM connected yet" string as `content` (not JSON). generateDesignPlan()'s
   * parseDesignPlanContent() then fails to parse that string and falls back to
   * buildDefaultDesignPlan() — exactly what the two tests above (with a fake chat fn) already
   * verified in isolation, but here proven through the real CLI subprocess end-to-end.
   */
  it("[real CLI] falls back to the deterministic plan end-to-end when no provider is configured", async () => {
    const result = await generateDesignPlan(input);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultDesignPlan(input));
  }, 15000);
});
