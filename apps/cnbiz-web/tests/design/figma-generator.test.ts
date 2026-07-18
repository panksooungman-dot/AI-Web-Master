import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildDefaultFigmaImportContent,
  buildFigmaExportContent,
  exportFigmaFile,
  importFigmaFile,
} from "../../lib/design/figma-generator";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import { buildDefaultPrototype } from "../../lib/design/prototype-generator";
import { buildDefaultClaudeDesign } from "../../lib/design/claude-design-generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";
import type { PrototypeRecord } from "../../lib/design/prototype";
import type { ClaudeDesignRecord } from "../../lib/design/claude-design";

const PLAN_INPUT: DesignPlanInput = {
  projectName: "Harbor Realty",
  projectType: "corporate",
  requirements: "매물 소개, 문의, 회사 소개가 필요합니다.",
  targetUsers: "부동산 구매자",
};

const PLAN: DesignPlanRecord = {
  id: "design-plan-harbor",
  input: PLAN_INPUT,
  content: buildDefaultDesignPlan(PLAN_INPUT),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const STORYBOARD: StoryboardRecord = {
  id: "storyboard-harbor",
  planId: PLAN.id,
  content: buildDefaultStoryboard(PLAN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const WIREFRAME: WireframeRecord = {
  id: "wireframe-harbor",
  storyboardId: STORYBOARD.id,
  planId: PLAN.id,
  content: buildDefaultWireframe(STORYBOARD),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const PROTOTYPE: PrototypeRecord = {
  id: "prototype-harbor",
  wireframeId: WIREFRAME.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultPrototype(WIREFRAME),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const CLAUDE_DESIGN: ClaudeDesignRecord = {
  id: "claude-design-harbor",
  prototypeId: PROTOTYPE.id,
  planId: PLAN.id,
  content: buildDefaultClaudeDesign(PROTOTYPE),
  simulated: true,
  createdAt: new Date().toISOString(),
};

describe("Figma Generator — buildDefaultFigmaImportContent()", () => {
  it("produces non-empty pages/frames/components/tokens/assets", () => {
    const content = buildDefaultFigmaImportContent("abc123");
    expect(content.pages.length).toBeGreaterThan(0);
    expect(content.frames.length).toBeGreaterThan(0);
    expect(content.components.length).toBeGreaterThan(0);
    expect(content.tokens.length).toBeGreaterThan(0);
    expect(content.assets.length).toBeGreaterThan(0);
  });

  it("asset name references the given figmaFileId", () => {
    const content = buildDefaultFigmaImportContent("file-xyz");
    expect(content.assets[0].name).toContain("file-xyz");
  });
});

describe("Figma Generator — buildFigmaExportContent()", () => {
  it("creates one Page per Wireframe screen and 3 Frames per screen (desktop/tablet/mobile)", () => {
    const content = buildFigmaExportContent({ wireframe: WIREFRAME, prototype: PROTOTYPE, claudeDesign: CLAUDE_DESIGN });

    expect(content.pages).toHaveLength(WIREFRAME.content.layouts.length);
    expect(content.frames).toHaveLength(WIREFRAME.content.layouts.length * 3);

    for (const layout of WIREFRAME.content.layouts) {
      const frames = content.frames.filter((f) => f.page === layout.screen);
      expect(frames.map((f) => f.breakpoint).sort()).toEqual(["desktop", "mobile", "tablet"]);
    }
  });

  it("derives Components from the Wireframe's component inventory", () => {
    const content = buildFigmaExportContent({ wireframe: WIREFRAME, prototype: PROTOTYPE, claudeDesign: CLAUDE_DESIGN });
    const expectedTypes = WIREFRAME.content.components.map((c) => c.type).sort();
    expect(content.components.map((c) => c.type).sort()).toEqual(expectedTypes);
  });

  it("includes the standard CNBIZ design token palette (Primary/Secondary/Success/Warning/Danger/Info/Neutral)", () => {
    const content = buildFigmaExportContent({ wireframe: WIREFRAME, prototype: PROTOTYPE, claudeDesign: CLAUDE_DESIGN });
    const names = content.tokens.map((t) => t.name);
    for (const expected of ["Primary", "Secondary", "Success", "Warning", "Danger", "Info", "Neutral"]) {
      expect(names).toContain(expected);
    }
  });

  it("is structurally deterministic across repeated calls (same counts/names, ids differ)", () => {
    const a = buildFigmaExportContent({ wireframe: WIREFRAME, prototype: PROTOTYPE, claudeDesign: CLAUDE_DESIGN });
    const b = buildFigmaExportContent({ wireframe: WIREFRAME, prototype: PROTOTYPE, claudeDesign: CLAUDE_DESIGN });

    expect(a.pages.map((p) => p.name)).toEqual(b.pages.map((p) => p.name));
    expect(a.tokens.map((t) => t.value)).toEqual(b.tokens.map((t) => t.value));
  });
});

describe("Figma Generator — importFigmaFile()", () => {
  const originalToken = process.env.FIGMA_API_TOKEN;

  beforeEach(() => {
    delete process.env.FIGMA_API_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.FIGMA_API_TOKEN;
    else process.env.FIGMA_API_TOKEN = originalToken;
  });

  it("falls back to deterministic content (simulated:true) when FIGMA_API_TOKEN is not set", async () => {
    const result = await importFigmaFile({ figmaFileId: "no-token-file" });
    expect(result.simulated).toBe(true);
    expect(result.fileName).toBe("Figma File no-token-file");
    expect(result.content.pages.length).toBeGreaterThan(0);
  });

  it("uses the real Figma API response (simulated:false) when FIGMA_API_TOKEN is set and the call succeeds", async () => {
    process.env.FIGMA_API_TOKEN = "fake-token";

    const fakeResponse = {
      name: "Real Figma File",
      document: {
        children: [
          {
            id: "canvas-1",
            name: "Page 1",
            children: [
              { id: "frame-1", name: "Home", type: "FRAME", absoluteBoundingBox: { width: 1440, height: 900 } },
              { id: "text-1", name: "Not a frame", type: "TEXT" },
            ],
          },
        ],
      },
      components: { "comp-1": { name: "Button" } },
    };

    const fakeFetch = async () =>
      new Response(JSON.stringify(fakeResponse), { status: 200, headers: { "Content-Type": "application/json" } });

    const result = await importFigmaFile({ figmaFileId: "real-file" }, fakeFetch);

    expect(result.simulated).toBe(false);
    expect(result.fileName).toBe("Real Figma File");
    expect(result.content.pages).toEqual([{ id: "canvas-1", name: "Page 1", frameCount: 1 }]);
    expect(result.content.frames).toHaveLength(1);
    expect(result.content.frames[0].name).toBe("Home");
    expect(result.content.components).toHaveLength(1);
    expect(result.content.components[0].name).toBe("Button");
  });

  it("falls back to deterministic content when the Figma API call returns a non-ok response", async () => {
    process.env.FIGMA_API_TOKEN = "fake-token";
    const fakeFetch = async () => new Response("not found", { status: 404 });

    const result = await importFigmaFile({ figmaFileId: "missing-file" }, fakeFetch);
    expect(result.simulated).toBe(true);
  });

  it("falls back to deterministic content when the fetch call throws (network error)", async () => {
    process.env.FIGMA_API_TOKEN = "fake-token";
    const fakeFetch = async () => {
      throw new Error("network down");
    };

    const result = await importFigmaFile({ figmaFileId: "network-error-file" }, fakeFetch);
    expect(result.simulated).toBe(true);
  });

  it("falls back to deterministic content when the API response has no usable document tree", async () => {
    process.env.FIGMA_API_TOKEN = "fake-token";
    const fakeFetch = async () =>
      new Response(JSON.stringify({ name: "Empty" }), { status: 200, headers: { "Content-Type": "application/json" } });

    const result = await importFigmaFile({ figmaFileId: "malformed-file" }, fakeFetch);
    expect(result.simulated).toBe(true);
  });
});

describe("Figma Generator — exportFigmaFile()", () => {
  const originalToken = process.env.FIGMA_API_TOKEN;

  beforeEach(() => {
    delete process.env.FIGMA_API_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.FIGMA_API_TOKEN;
    else process.env.FIGMA_API_TOKEN = originalToken;
  });

  it("returns deterministic content marked simulated:true when FIGMA_API_TOKEN is not set", async () => {
    const result = await exportFigmaFile({
      figmaFileId: "export-file",
      wireframe: WIREFRAME,
      prototype: PROTOTYPE,
      claudeDesign: CLAUDE_DESIGN,
    });

    const expected = buildFigmaExportContent({ wireframe: WIREFRAME, prototype: PROTOTYPE, claudeDesign: CLAUDE_DESIGN });

    expect(result.simulated).toBe(true);
    // ids are freshly generated per call (Date.now()+random), so compare structure, not identity.
    expect(result.content.pages.map((p) => p.name)).toEqual(expected.pages.map((p) => p.name));
    expect(result.content.frames.map((f) => f.name)).toEqual(expected.frames.map((f) => f.name));
    expect(result.content.components.map((c) => c.type)).toEqual(expected.components.map((c) => c.type));
    expect(result.content.tokens.map((t) => t.value)).toEqual(expected.tokens.map((t) => t.value));
  });

  it("marks simulated:false when FIGMA_API_TOKEN is set and the Variables push succeeds", async () => {
    process.env.FIGMA_API_TOKEN = "fake-token";
    const fakeFetch = async () => new Response(JSON.stringify({ meta: {} }), { status: 200 });

    const result = await exportFigmaFile(
      { figmaFileId: "export-file", wireframe: WIREFRAME, prototype: PROTOTYPE, claudeDesign: CLAUDE_DESIGN },
      fakeFetch
    );

    expect(result.simulated).toBe(false);
  });

  it("marks simulated:true (but content unchanged) when the Variables push fails (e.g. non-Enterprise plan)", async () => {
    process.env.FIGMA_API_TOKEN = "fake-token";
    const fakeFetch = async () => new Response("forbidden", { status: 403 });

    const result = await exportFigmaFile(
      { figmaFileId: "export-file", wireframe: WIREFRAME, prototype: PROTOTYPE, claudeDesign: CLAUDE_DESIGN },
      fakeFetch
    );

    expect(result.simulated).toBe(true);
    expect(result.content.pages.length).toBeGreaterThan(0);
  });
});
