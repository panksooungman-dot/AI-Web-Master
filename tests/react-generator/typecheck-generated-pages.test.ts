import fs from "fs";
import path from "path";
import ts from "typescript";
import { afterAll, describe, expect, it } from "vitest";
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

/** One component per ComponentType, each carrying the same Adapter-style traceability prop
 *  (`claude-design-document-adapter.ts`'s `{ sourceType: wireframeType }`) plus whatever specific
 *  props that type's dedicated renderer (tsx.ts) actually reads, so every render path — not just
 *  the generic fallback — is exercised in one page. */
function allComponentTypesSection(): Component[] {
  const withTrace = (type: ComponentType, props: Record<string, unknown>): Component => ({
    id: `c-${type}`,
    type,
    props: { sourceType: "Header", ...props },
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

describe("React Generator — generated TSX actually type-checks (real tsc, real @types/react/next)", () => {
  let tmpDir: string | null = null;

  afterAll(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
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

    // Written under the repo root (not os.tmpdir()) so TypeScript's node_modules resolution
    // walks up and finds this repo's real `react`/`next` type declarations.
    tmpDir = fs.mkdtempSync(path.join(REPO_ROOT, ".typecheck-fixture-"));
    const filePath = path.join(tmpDir, "page.tsx");
    fs.writeFileSync(filePath, tree.pages[0].tsx, "utf-8");

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

    const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => tmpDir!,
      getCanonicalFileName: (f) => f,
      getNewLine: () => "\n",
    });

    expect(diagnostics, formatted).toHaveLength(0);
  });
});
