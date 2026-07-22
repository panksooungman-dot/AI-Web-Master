import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import {
  getOrBuildDesignDocumentForPlan,
  getOrBuildDesignDocumentForStoryboard,
  getOrBuildDesignDocumentForWireframe,
  getOrBuildDesignDocumentForPrototype,
} from "../../lib/design/design-document-service";
import { saveDesignDocument, getLatestDesignDocument } from "../../lib/design/design-document-registry";
import { planToDesignDocument } from "../../lib/design/design-document-adapter";
import { storyboardToDesignDocument } from "../../lib/design/wireframe-document-adapter";
import { wireframeToDesignDocument } from "../../lib/design/prototype-document-adapter";
import { prototypeToDesignDocument } from "../../lib/design/claude-design-document-adapter";
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

/** A value no real adapter would ever produce — proves "reuse" returned the persisted record verbatim. */
const SENTINEL_PROJECT_NAME = "__PERSISTED_SENTINEL__";

describe("Design Document Service — lib/design/design-document-service.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "design-document-service-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  describe("getOrBuildDesignDocumentForPlan()", () => {
    it("builds fresh via planToDesignDocument() and persists it when nothing exists yet", async () => {
      const result = await getOrBuildDesignDocumentForPlan(PLAN, store);
      expect(result).toEqual(planToDesignDocument(PLAN));

      const persisted = await getLatestDesignDocument(PLAN.id, store);
      expect(persisted?.version).toBe(1);
      expect(persisted?.document).toEqual(result);
    });

    it("reuses the persisted document verbatim on a second call — does not rebuild", async () => {
      const fresh = planToDesignDocument(PLAN);
      const sentinelDocument = { ...fresh, metadata: { ...fresh.metadata, projectName: SENTINEL_PROJECT_NAME } };
      await saveDesignDocument({ projectId: PLAN.id, document: sentinelDocument }, store);

      const result = await getOrBuildDesignDocumentForPlan(PLAN, store);
      expect(result.metadata.projectName).toBe(SENTINEL_PROJECT_NAME);

      const persisted = await getLatestDesignDocument(PLAN.id, store);
      expect(persisted?.version).toBe(1); // no new version was saved
    });
  });

  describe("getOrBuildDesignDocumentForStoryboard()", () => {
    it("builds fresh via storyboardToDesignDocument() and persists it when nothing exists yet", async () => {
      const result = await getOrBuildDesignDocumentForStoryboard(STORYBOARD, store);
      expect(result).toEqual(storyboardToDesignDocument(STORYBOARD));

      const persisted = await getLatestDesignDocument(STORYBOARD.planId, store);
      expect(persisted?.version).toBe(1);
    });

    it("reuses the persisted document verbatim on a second call — does not rebuild", async () => {
      const fresh = storyboardToDesignDocument(STORYBOARD);
      const sentinelDocument = { ...fresh, metadata: { ...fresh.metadata, projectName: SENTINEL_PROJECT_NAME } };
      await saveDesignDocument({ projectId: STORYBOARD.planId, document: sentinelDocument }, store);

      const result = await getOrBuildDesignDocumentForStoryboard(STORYBOARD, store);
      expect(result.metadata.projectName).toBe(SENTINEL_PROJECT_NAME);
    });
  });

  describe("getOrBuildDesignDocumentForWireframe()", () => {
    it("builds fresh via wireframeToDesignDocument() and persists it when nothing exists yet", async () => {
      const result = await getOrBuildDesignDocumentForWireframe(WIREFRAME, store);
      expect(result).toEqual(wireframeToDesignDocument(WIREFRAME));

      const persisted = await getLatestDesignDocument(WIREFRAME.planId, store);
      expect(persisted?.version).toBe(1);
    });

    it("reuses the persisted document verbatim on a second call — does not rebuild", async () => {
      const fresh = wireframeToDesignDocument(WIREFRAME);
      const sentinelDocument = { ...fresh, metadata: { ...fresh.metadata, projectName: SENTINEL_PROJECT_NAME } };
      await saveDesignDocument({ projectId: WIREFRAME.planId, document: sentinelDocument }, store);

      const result = await getOrBuildDesignDocumentForWireframe(WIREFRAME, store);
      expect(result.metadata.projectName).toBe(SENTINEL_PROJECT_NAME);
    });
  });

  describe("getOrBuildDesignDocumentForPrototype()", () => {
    it("builds fresh via prototypeToDesignDocument() (sections populated) and persists it when nothing exists yet", async () => {
      const result = await getOrBuildDesignDocumentForPrototype(PROTOTYPE, store);
      expect(result).toEqual(prototypeToDesignDocument(PROTOTYPE));
      expect(result.pages.some((page) => page.sections.length > 0)).toBe(true);

      const persisted = await getLatestDesignDocument(PROTOTYPE.planId, store);
      expect(persisted?.version).toBe(1);
    });

    it("reuses the persisted document verbatim on a second call — does not rebuild", async () => {
      const fresh = prototypeToDesignDocument(PROTOTYPE);
      const sentinelDocument = { ...fresh, metadata: { ...fresh.metadata, projectName: SENTINEL_PROJECT_NAME } };
      await saveDesignDocument({ projectId: PROTOTYPE.planId, document: sentinelDocument }, store);

      const result = await getOrBuildDesignDocumentForPrototype(PROTOTYPE, store);
      expect(result.metadata.projectName).toBe(SENTINEL_PROJECT_NAME);
    });
  });

  it("all four stages resolve to the SAME project's persisted document once any one of them has saved it", async () => {
    // Planning saves first (as it would be first in the real pipeline order).
    await getOrBuildDesignDocumentForPlan(PLAN, store);

    // Storyboard/Wireframe/Prototype share the same projectId (plan.id) and now find it already there.
    const viaStoryboard = await getOrBuildDesignDocumentForStoryboard(STORYBOARD, store);
    const viaWireframe = await getOrBuildDesignDocumentForWireframe(WIREFRAME, store);
    const viaPrototype = await getOrBuildDesignDocumentForPrototype(PROTOTYPE, store);

    expect(viaStoryboard).toEqual(viaWireframe);
    expect(viaWireframe).toEqual(viaPrototype);

    const persisted = await getLatestDesignDocument(PLAN.id, store);
    expect(persisted?.version).toBe(1); // still just the one Planning saved — nobody rebuilt/re-saved
  });
});
