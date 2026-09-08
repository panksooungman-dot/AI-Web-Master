import fs from "fs";
import path from "path";
import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";
import { generateReactComponentTree } from "../../packages/cli/src/generators/react/index.js";
import type { Component, ComponentType, DesignDocument } from "@cnbiz/design-system/types/design";

/**
 * The React Generator (packages/cli/src/generators/react) is a pure serializer: DesignDocument
 * → TSX text, no filesystem access. Existing tests check that text against expectations
 * (imports present, quotes escaped, sourceType namespaced under data-*), but none of them ask
 * an actual TypeScript compiler whether the result is valid Next.js source — which is exactly
 * how the `sourceType={"Header"}` bug (2026-09-08) slipped through every prior review: it type
 * -checked fine as a *string*, and only broke once fed to `tsc` inside a real generated project.
 *
 * This test closes that gap without needing a full scaffold + `npm install` (slow, network-
 * dependent, not CI-friendly): it writes the generated `.tsx` straight into a throwaway
 * directory *under the repo root* (so Node's module resolution walks up to the repo's own
 * `node_modules` — real `react`/`next` types, not stubs) and runs the TypeScript Compiler API
 * over it with this repo's own compiler options. A red diagnostic here means a real Design
 * Automation build (Wireframe/Prototype/ClaudeDesign → Website Build) would fail `tsc` too.
 */

const REPO_ROOT = path.join(__dirname, "..", "..");

function baseDocument(overrides: Partial<DesignDocument> = {}): DesignDocument {
  return {
    version: "1.0.0",
    metadata: {
      projectName: "Typecheck Fixture",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    theme: { colors: {}, typography: {}, spacing: {}, radius: {}, shadow: {} },
    pages: [],
    ...overrides,
  };
}

/** One component per ComponentType, each carrying an arbitrary Adapter-style traceability prop
 *  (`claude-design-document-adapter.ts`'s `{ sourceType: wireframeType }` shape, but a value —
 *  "Untracked" — that isn't one of the 11 recognized Wireframe landmark keywords tsx.ts now
 *  dispatches on) plus whatever specific props that type's dedicated renderer (tsx.ts) actually
 *  reads, so every base render path — not just the generic fallback — is exercised in one page
 *  without being redirected into a landmark renderer. */
function allComponentTypesSection(): Component[] {
  const withTrace = (type: ComponentType, props: Record<string, unknown>): Component => ({
    id: `c-${type}`,
    type,
    props: { sourceType: "Untracked", ...props },
  });

  return [
    withTrace("heading", { text: "Welcome" }),
    withTrace("text", { text: `Say "hi" { welcome }` }),
    withTrace("button", { text: "Contact", href: "/contact" }),
    withTrace("button", { text: "Submit" }),
    withTrace("image", { src: "/a.png", alt: "a" }),
    withTrace("icon", {}),
    withTrace("card", {}),
    withTrace("form", { fields: [{ name: "email", label: "Email", type: "email", required: true }] }),
    withTrace("input", {}),
    withTrace("textarea", {}),
    withTrace("checkbox", {}),
    withTrace("radio", {}),
    withTrace("select", {}),
    withTrace("video", {}),
    withTrace("map", {}),
    withTrace("divider", {}),
    withTrace("container", {}),
    withTrace("grid", {}),
    withTrace("navbar", { logo: "Acme", items: [{ label: "Home", href: "/" }] }),
  ];
}

/** Mirrors `claude-design-document-adapter.ts`'s `WIREFRAME_TO_DESIGN_COMPONENT` + `buildPageSections()`
 *  exactly: one component per Wireframe landmark type (Button/Form excluded — those already had a
 *  real dedicated renderer before 2026-09-08 and are covered by the test above), each carrying
 *  only `{ sourceType: <landmark> }`, nothing else — this is precisely what a real Wireframe Board
 *  edit produces once it reaches Prototype → DesignDocument. */
function wireframeLandmarkSection(): Component[] {
  const landmarks = [
    "Header",
    "Navigation",
    "Sidebar",
    "Hero",
    "Card",
    "Table",
    "Dashboard",
    "Footer",
    "Modal",
    "Search",
    "Pagination",
  ] as const;

  const designTypeFor: Record<(typeof landmarks)[number], ComponentType> = {
    Header: "container",
    Navigation: "container",
    Sidebar: "container",
    Hero: "container",
    Card: "card",
    Table: "grid",
    Dashboard: "grid",
    Footer: "container",
    Modal: "container",
    Search: "input",
    Pagination: "button",
  };

  return landmarks.map((landmark, index) => ({
    id: `c-${index}-${landmark.toLowerCase()}`,
    type: designTypeFor[landmark],
    props: { sourceType: landmark },
  }));
}

function typecheckTsx(tsx: string, tmpDirPrefix: string): { diagnosticsText: string; diagnosticCount: number; dir: string } {
  // Written under the repo root (not os.tmpdir()) so TypeScript's node_modules resolution walks
  // up and finds this repo's real `react`/`next` type declarations.
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, tmpDirPrefix));
  const filePath = path.join(dir, "page.tsx");
  fs.writeFileSync(filePath, tsx, "utf-8");

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2017,
    lib: ["dom", "dom.iterable", "esnext"],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    resolveJsonModule: true,
    isolatedModules: true,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
  };

  const program = ts.createProgram([filePath], compilerOptions);
  const diagnostics = ts.getPreEmitDiagnostics(program).filter((d) => d.file?.fileName === filePath);
  const diagnosticsText = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => dir,
    getCanonicalFileName: (f) => f,
    getNewLine: () => "\n",
  });

  return { diagnosticsText, diagnosticCount: diagnostics.length, dir };
}

describe("React Generator — generated TSX actually type-checks (real tsc, real @types/react/next)", () => {
  const dirsToClean: string[] = [];

  afterEach(() => {
    while (dirsToClean.length > 0) fs.rmSync(dirsToClean.pop()!, { recursive: true, force: true });
  });

  it("produces zero tsc diagnostics for a page covering every ComponentType", () => {
    const document = baseDocument({
      pages: [
        {
          id: "home",
          title: "Home",
          path: "/",
          sections: [{ id: "s", type: "hero", components: allComponentTypesSection() }],
        },
      ],
    });

    const tree = generateReactComponentTree(document);
    expect(tree.pages).toHaveLength(1);

    const { diagnosticsText, diagnosticCount, dir } = typecheckTsx(tree.pages[0].tsx, ".typecheck-fixture-");
    dirsToClean.push(dir);

    expect(diagnosticCount, diagnosticsText).toBe(0);
  });

  it("renders every Wireframe landmark type through its dedicated renderer, and the page still type-checks", () => {
    const document = baseDocument({
      pages: [
        {
          id: "home",
          title: "Home",
          path: "/",
          sections: [{ id: "s", type: "hero", components: wireframeLandmarkSection() }],
        },
      ],
    });

    const tsx = generateReactComponentTree(document).pages[0].tsx;

    // A landmark that fell through to the pre-2026-09-08 generic renderer would show up here as
    // an empty `<div data-source-type="X" />` instead of its own semantic tag/placeholder copy.
    expect(tsx).toContain("<header");
    expect(tsx).toContain("로고");
    expect(tsx).toContain("<footer");
    expect(tsx).toContain("<aside");
    expect(tsx).toContain("핵심 메시지를 입력하세요");
    expect(tsx).toContain("<table");
    expect(tsx).toContain('type="search"');
    expect(tsx).not.toMatch(/<div data-source-type=\{"(Header|Footer|Sidebar|Hero|Card|Table|Dashboard|Modal)"\} \/>/);

    const { diagnosticsText, diagnosticCount, dir } = typecheckTsx(tsx, ".typecheck-landmarks-");
    dirsToClean.push(dir);

    expect(diagnosticCount, diagnosticsText).toBe(0);
  });
});
