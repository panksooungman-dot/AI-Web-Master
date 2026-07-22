import { describe, expect, it } from "vitest";
import { buildWebsiteBuildHybridSource } from "../../lib/design/website-build-document-adapter";
import { planToDesignDocument } from "../../lib/design/design-document-adapter";
import { prototypeToDesignDocument } from "../../lib/design/claude-design-document-adapter";
import { planToWebsiteBuildInputs } from "../../lib/design/website-build-adapter";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultPrototype } from "../../lib/design/prototype-generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";
import type { PrototypeRecord } from "../../lib/design/prototype";

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

describe("Website Build Document Adapter — lib/design/website-build-document-adapter.ts", () => {
  it("without a prototype, falls back to the Phase 1 skeleton DesignDocument (planToDesignDocument)", () => {
    const source = buildWebsiteBuildHybridSource(PLAN);
    expect(source.document).toEqual(planToDesignDocument(PLAN));
  });

  it("with a prototype, uses the Phase 6 enriched DesignDocument (prototypeToDesignDocument, sections populated)", () => {
    const source = buildWebsiteBuildHybridSource(PLAN, PROTOTYPE);
    expect(source.document).toEqual(prototypeToDesignDocument(PROTOTYPE));
    expect(source.document.pages.some((page) => page.sections.length > 0)).toBe(true);
  });

  it("treats an explicit null prototype the same as omitting it", () => {
    const withNull = buildWebsiteBuildHybridSource(PLAN, null);
    const omitted = buildWebsiteBuildHybridSource(PLAN);
    expect(withNull.document).toEqual(omitted.document);
  });

  it("pages/theme are convenience aliases of document.pages/document.theme", () => {
    const source = buildWebsiteBuildHybridSource(PLAN, PROTOTYPE);
    expect(source.pages).toBe(source.document.pages);
    expect(source.theme).toBe(source.document.theme);
  });

  it("inputs are exactly what the existing website-build-adapter.ts already produces (no new logic)", () => {
    const source = buildWebsiteBuildHybridSource(PLAN, PROTOTYPE);
    expect(source.inputs).toEqual(planToWebsiteBuildInputs(PLAN));
  });
});
