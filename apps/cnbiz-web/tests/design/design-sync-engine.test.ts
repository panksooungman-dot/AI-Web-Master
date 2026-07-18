import { describe, expect, it } from "vitest";
import {
  applyCodeOverride,
  buildCodeSnapshot,
  buildDesignSnapshot,
  buildPatch,
  computeSync,
  detectConflicts,
} from "../../lib/design/design-sync-engine";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";
import type { SyncRecord } from "../../lib/design/design-sync";

const PLAN_INPUT: DesignPlanInput = {
  projectName: "Sync Test Co",
  projectType: "corporate",
  requirements: "회사 소개와 문의가 필요합니다.",
  targetUsers: "B2B",
};

const PLAN: DesignPlanRecord = {
  id: "design-plan-sync",
  input: PLAN_INPUT,
  content: buildDefaultDesignPlan(PLAN_INPUT),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const STORYBOARD: StoryboardRecord = {
  id: "storyboard-sync",
  planId: PLAN.id,
  content: buildDefaultStoryboard(PLAN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const WIREFRAME: WireframeRecord = {
  id: "wireframe-sync",
  storyboardId: STORYBOARD.id,
  planId: PLAN.id,
  content: buildDefaultWireframe(STORYBOARD),
  simulated: true,
  createdAt: new Date().toISOString(),
};

function buildSyncRecordFixture(designHash: string, codeHash: string): SyncRecord {
  const design = buildDesignSnapshot(WIREFRAME, null);
  const code = buildCodeSnapshot(design);
  return {
    id: "sync-fixture",
    reviewId: "review-1",
    planId: PLAN.id,
    figmaId: null,
    version: 1,
    status: "in_sync",
    direction: "design-to-code",
    designSnapshot: { ...design, hash: designHash },
    codeSnapshot: { ...code, hash: codeHash },
    patch: [],
    conflicts: [],
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("Design Sync Engine — buildDesignSnapshot()", () => {
  it("derives screens/components from the Wireframe and falls back to the CNBIZ token palette when no Figma record is given", () => {
    const snapshot = buildDesignSnapshot(WIREFRAME, null);
    expect(snapshot.screens).toEqual(WIREFRAME.content.layouts.map((l) => l.screen));
    expect(snapshot.components.length).toBeGreaterThan(0);
    expect(snapshot.tokens.some((t) => t.name === "Primary" && t.value === "#005BAC")).toBe(true);
    expect(snapshot.hash).toBeTruthy();
  });

  it("is deterministic for the same Wireframe", () => {
    const a = buildDesignSnapshot(WIREFRAME, null);
    const b = buildDesignSnapshot(WIREFRAME, null);
    expect(a).toEqual(b);
  });
});

describe("Design Sync Engine — buildCodeSnapshot()", () => {
  it("generates one code component per design component and a theme block referencing design tokens", () => {
    const design = buildDesignSnapshot(WIREFRAME, null);
    const code = buildCodeSnapshot(design);

    expect(code.components.map((c) => c.name).sort()).toEqual(design.components.slice().sort());
    expect(code.theme).toContain("--primary: #005BAC");
    expect(code.hash).toBeTruthy();
  });
});

describe("Design Sync Engine — applyCodeOverride()", () => {
  it("returns the auto-generated snapshot unchanged when no override is given", () => {
    const design = buildDesignSnapshot(WIREFRAME, null);
    const auto = buildCodeSnapshot(design);
    expect(applyCodeOverride(auto, null)).toEqual(auto);
  });

  it("overrides a matching component's code and recomputes the hash", () => {
    const design = buildDesignSnapshot(WIREFRAME, null);
    const auto = buildCodeSnapshot(design);
    const targetName = auto.components[0].name;

    const overridden = applyCodeOverride(auto, { components: [{ name: targetName, code: "// edited by hand" }] });

    expect(overridden.components.find((c) => c.name === targetName)?.code).toBe("// edited by hand");
    expect(overridden.hash).not.toBe(auto.hash);
    // other components are untouched
    const other = auto.components.find((c) => c.name !== targetName);
    if (other) {
      expect(overridden.components.find((c) => c.name === other.name)?.code).toBe(other.code);
    }
  });

  it("overrides the theme when given", () => {
    const design = buildDesignSnapshot(WIREFRAME, null);
    const auto = buildCodeSnapshot(design);
    const overridden = applyCodeOverride(auto, { theme: ":root { --primary: #ff0000; }" });
    expect(overridden.theme).toBe(":root { --primary: #ff0000; }");
  });
});

describe("Design Sync Engine — buildPatch()", () => {
  it("marks everything as added when there is no previous record", () => {
    const design = buildDesignSnapshot(WIREFRAME, null);
    const code = buildCodeSnapshot(design);
    const patch = buildPatch(null, design, code);

    expect(patch.every((p) => p.type === "added")).toBe(true);
    expect(patch.some((p) => p.target.startsWith("screen:"))).toBe(true);
    expect(patch.some((p) => p.target.startsWith("code:"))).toBe(true);
  });

  it("reports no patch entries when nothing changed since the previous record", () => {
    const design = buildDesignSnapshot(WIREFRAME, null);
    const code = buildCodeSnapshot(design);
    const previous = { ...buildSyncRecordFixture(design.hash, code.hash), designSnapshot: design, codeSnapshot: code };

    expect(buildPatch(previous, design, code)).toEqual([]);
  });

  it("reports a 'changed' entry when a token value changes", () => {
    const design = buildDesignSnapshot(WIREFRAME, null);
    const code = buildCodeSnapshot(design);
    const previous = { ...buildSyncRecordFixture(design.hash, code.hash), designSnapshot: design, codeSnapshot: code };

    const nextDesign = { ...design, tokens: design.tokens.map((t) => (t.name === "Primary" ? { ...t, value: "#000000" } : t)) };
    const patch = buildPatch(previous, nextDesign, code);

    expect(patch).toContainEqual({ type: "changed", target: "token:Primary", detail: "#005BAC → #000000" });
  });
});

describe("Design Sync Engine — detectConflicts()", () => {
  it("returns no conflicts when there is no previous record", () => {
    const design = buildDesignSnapshot(WIREFRAME, null);
    const code = buildCodeSnapshot(design);
    expect(detectConflicts(null, code, code, true)).toEqual([]);
  });

  it("returns no conflicts when the candidate code matches the auto-generated code", () => {
    const design = buildDesignSnapshot(WIREFRAME, null);
    const code = buildCodeSnapshot(design);
    const previous = buildSyncRecordFixture(design.hash, code.hash);
    expect(detectConflicts(previous, code, code, true)).toEqual([]);
  });

  it("returns no conflicts when only the code changed (design unchanged) — accepted as a normal update", () => {
    const design = buildDesignSnapshot(WIREFRAME, null);
    const auto = buildCodeSnapshot(design);
    const candidate = applyCodeOverride(auto, { theme: ":root { --primary: #ff0000; }" });
    const previous = buildSyncRecordFixture(design.hash, auto.hash);

    expect(detectConflicts(previous, auto, candidate, false)).toEqual([]);
  });

  it("returns conflicts when both design and code changed and they disagree", () => {
    const design = buildDesignSnapshot(WIREFRAME, null);
    const auto = buildCodeSnapshot(design);
    const candidate = applyCodeOverride(auto, { theme: ":root { --primary: #ff0000; }" });
    const previous = buildSyncRecordFixture("some-other-design-hash", auto.hash);

    const conflicts = detectConflicts(previous, auto, candidate, true);
    expect(conflicts.some((c) => c.target === "theme")).toBe(true);
  });
});

describe("Design Sync Engine — computeSync()", () => {
  it("design-to-code is always in_sync (auto-generated code always matches the design)", () => {
    const result = computeSync({ direction: "design-to-code", wireframe: WIREFRAME, figma: null, previous: null });
    expect(result.status).toBe("in_sync");
    expect(result.conflicts).toEqual([]);
  });

  it("code-to-design without a codeOverride is a no-op (matches auto-generated code, in_sync)", () => {
    const design = buildDesignSnapshot(WIREFRAME, null);
    const code = buildCodeSnapshot(design);
    const previous = buildSyncRecordFixture(design.hash, code.hash);

    const result = computeSync({ direction: "code-to-design", wireframe: WIREFRAME, figma: null, previous });
    expect(result.status).toBe("in_sync");
  });

  it("code-to-design with a diverging codeOverride and a changed design produces a conflict", () => {
    const previous = buildSyncRecordFixture("stale-design-hash", "stale-code-hash");

    const result = computeSync({
      direction: "code-to-design",
      wireframe: WIREFRAME,
      figma: null,
      previous,
      codeOverride: { theme: ":root { --primary: #ff0000; }" },
    });

    expect(result.status).toBe("conflict");
    expect(result.conflicts.length).toBeGreaterThan(0);
  });
});
