import { describe, expect, it } from "vitest";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultPrototype } from "../../lib/design/prototype-generator";
import { planToWebsiteBuildInputs } from "../../lib/design/website-build-adapter";
import { buildWebsiteBuildHybridSource } from "../../lib/design/website-build-document-adapter";
import { prototypeToDesignDocument } from "../../lib/design/claude-design-document-adapter";
import { planToDesignDocument } from "../../lib/design/design-document-adapter";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";
import type { PrototypeRecord } from "../../lib/design/prototype";

/**
 * Design JSON Standardization Phase 9 — regression coverage for the input-assembly swap made in
 * `app/api/design/website/route.ts` (planToWebsiteBuildInputs(plan) → buildWebsiteBuildHybridSource
 * (plan, prototype).inputs). The route itself can't be integration-tested directly in this repo
 * (next/headers's cookies() throws outside a real request scope, same limitation documented since
 * Phase 1) — this test instead proves, at the layer directly beneath the route, that the swap is
 * behaviorally inert for the fields the CLI actually consumes, in both cases the route can hit:
 * with a resolved ClaudeDesign→Prototype chain, and without one (defensive fallback).
 */

const PLAN_INPUT: DesignPlanInput = {
  projectName: "Bright Smile Dental",
  projectType: "치과 웹사이트",
  requirements: "온라인 예약, 진료 안내, 오시는 길 안내가 필요합니다.",
  targetUsers: "지역 주민, 30~50대",
};

const PLAN: DesignPlanRecord = {
  id: "design-plan-1",
  input: PLAN_INPUT,
  content: buildDefaultDesignPlan(PLAN_INPUT),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const STORYBOARD: StoryboardRecord = {
  id: "storyboard-1",
  planId: PLAN.id,
  content: buildDefaultStoryboard(PLAN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const WIREFRAME: WireframeRecord = {
  id: "wireframe-1",
  storyboardId: STORYBOARD.id,
  planId: PLAN.id,
  content: buildDefaultWireframe(STORYBOARD),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const PROTOTYPE: PrototypeRecord = {
  id: "prototype-1",
  wireframeId: WIREFRAME.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultPrototype(WIREFRAME),
  simulated: true,
  createdAt: new Date().toISOString(),
};

describe("Website Build route integration — Phase 9 Hybrid Source swap", () => {
  it("with a resolved Prototype (the route's normal path): inputs match the legacy adapter exactly", () => {
    const legacy = planToWebsiteBuildInputs(PLAN);
    const hybrid = buildWebsiteBuildHybridSource(PLAN, PROTOTYPE);

    expect(hybrid.inputs).toEqual(legacy);
    expect(hybrid.document).toEqual(prototypeToDesignDocument(PROTOTYPE));
    expect(hybrid.document.pages.some((page) => page.sections.length > 0)).toBe(true);
  });

  it("without a resolvable ClaudeDesign/Prototype chain (defensive fallback): inputs still match the legacy adapter exactly", () => {
    const legacy = planToWebsiteBuildInputs(PLAN);
    const hybrid = buildWebsiteBuildHybridSource(PLAN, null);

    expect(hybrid.inputs).toEqual(legacy);
    expect(hybrid.document).toEqual(planToDesignDocument(PLAN));
  });

  it("the CLI args the route builds from `inputs` are identical whether assembled via the legacy adapter or the Hybrid Source", () => {
    function buildArgs(inputs: ReturnType<typeof planToWebsiteBuildInputs>): string[] {
      return [
        `--name "${inputs.name}"`,
        `--type "${inputs.businessType}"`,
        `--audience "${inputs.audience}"`,
        `--brand "${inputs.brand}"`,
        `--language "${inputs.language}"`,
        `--site-type "${inputs.siteType}"`,
      ];
    }

    const legacyArgs = buildArgs(planToWebsiteBuildInputs(PLAN));
    const hybridArgs = buildArgs(buildWebsiteBuildHybridSource(PLAN, PROTOTYPE).inputs);

    expect(hybridArgs).toEqual(legacyArgs);
  });
});
