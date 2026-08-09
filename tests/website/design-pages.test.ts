import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyDesignDocumentPages,
  parseDesignDocument,
} from "../../packages/cli/src/website/design-pages.js";
import type { DesignDocument } from "@cnbiz/design-system/types/design";

function documentWith(pages: DesignDocument["pages"]): DesignDocument {
  return {
    version: "1.0.0",
    metadata: { projectName: "Wiring Test", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    theme: { colors: {}, typography: {}, spacing: {}, radius: {}, shadow: {} },
    pages,
  };
}

describe("Website Builder ↔ React Generator wiring (packages/cli/src/website/design-pages.ts)", () => {
  let targetDir: string;

  beforeEach(() => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "design-pages-test-"));
  });

  afterEach(() => {
    fs.rmSync(targetDir, { recursive: true, force: true });
  });

  describe("parseDesignDocument()", () => {
    it("accepts a well-formed document", () => {
      expect(parseDesignDocument(documentWith([]))).not.toBeNull();
    });

    it.each([
      ["not an object", "nope"],
      ["missing version", { metadata: { projectName: "x" }, theme: {}, pages: [] }],
      ["missing metadata.projectName", { version: "1", metadata: {}, theme: {}, pages: [] }],
      ["pages is not an array", { version: "1", metadata: { projectName: "x" }, theme: {}, pages: {} }],
      [
        "a page is missing its path",
        { version: "1", metadata: { projectName: "x" }, theme: {}, pages: [{ id: "a", title: "A", sections: [] }] },
      ],
    ])("rejects %s", (_label, raw) => {
      expect(parseDesignDocument(raw)).toBeNull();
    });
  });

  describe("applyDesignDocumentPages()", () => {
    it("writes each page to its App Router route", async () => {
      const result = await applyDesignDocumentPages(
        targetDir,
        documentWith([
          { id: "home", title: "Home", path: "/", sections: [] },
          { id: "about", title: "About", path: "/about", sections: [] },
        ])
      );

      expect(result.written).toEqual(["app/page.tsx", "app/about/page.tsx"]);
      expect(fs.existsSync(path.join(targetDir, "app", "page.tsx"))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, "app", "about", "page.tsx"))).toBe(true);
    });

    it("creates intermediate directories for nested routes", async () => {
      await applyDesignDocumentPages(
        targetDir,
        documentWith([{ id: "p", title: "Pricing", path: "/services/pricing", sections: [] }])
      );

      expect(fs.existsSync(path.join(targetDir, "app", "services", "pricing", "page.tsx"))).toBe(true);
    });

    it("reports which scaffolded files it replaced", async () => {
      fs.mkdirSync(path.join(targetDir, "app"), { recursive: true });
      fs.writeFileSync(path.join(targetDir, "app", "page.tsx"), "// scaffold template", "utf-8");

      const result = await applyDesignDocumentPages(
        targetDir,
        documentWith([
          { id: "home", title: "Home", path: "/", sections: [] },
          { id: "about", title: "About", path: "/about", sections: [] },
        ])
      );

      expect(result.replaced).toEqual(["app/page.tsx"]);
      expect(fs.readFileSync(path.join(targetDir, "app", "page.tsx"), "utf-8")).not.toContain("scaffold template");
    });

    it("leaves files the document does not describe untouched", async () => {
      fs.mkdirSync(path.join(targetDir, "app", "contact"), { recursive: true });
      fs.writeFileSync(path.join(targetDir, "app", "contact", "page.tsx"), "// keep me", "utf-8");

      await applyDesignDocumentPages(targetDir, documentWith([{ id: "home", title: "Home", path: "/", sections: [] }]));

      expect(fs.readFileSync(path.join(targetDir, "app", "contact", "page.tsx"), "utf-8")).toBe("// keep me");
    });

    it("writes nothing for a document with no pages", async () => {
      const result = await applyDesignDocumentPages(targetDir, documentWith([]));

      expect(result.written).toEqual([]);
      expect(fs.existsSync(path.join(targetDir, "app"))).toBe(false);
    });

    it("writes the React Generator's TSX, not a placeholder", async () => {
      await applyDesignDocumentPages(
        targetDir,
        documentWith([
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [{ id: "hero", type: "hero", components: [{ id: "h", type: "heading", props: { text: "환영합니다" } }] }],
          },
        ])
      );

      const tsx = fs.readFileSync(path.join(targetDir, "app", "page.tsx"), "utf-8");
      expect(tsx).toContain("export default function HomePage()");
      expect(tsx).toContain(JSON.stringify("환영합니다"));
    });
  });

  describe("generated pages are valid Next.js App Router modules", () => {
    it('marks a page with event handlers "use client" and drops its metadata export', async () => {
      await applyDesignDocumentPages(
        targetDir,
        documentWith([
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [
              {
                id: "s",
                type: "hero",
                components: [{ id: "cta", type: "button", props: { text: "Go" }, events: { onClick: "navigate:/x" } }],
              },
            ],
          },
        ])
      );

      const tsx = fs.readFileSync(path.join(targetDir, "app", "page.tsx"), "utf-8");
      // Next.js rejects a metadata export from a "use client" module, so the two must not coexist.
      expect(tsx.startsWith('"use client";')).toBe(true);
      expect(tsx).not.toContain("export const metadata");
    });

    it("keeps a page without handlers as a Server Component with metadata", async () => {
      await applyDesignDocumentPages(
        targetDir,
        documentWith([
          {
            id: "about",
            title: "About",
            path: "/about",
            sections: [{ id: "s", type: "about", components: [{ id: "t", type: "text", props: { text: "hi" } }] }],
          },
        ])
      );

      const tsx = fs.readFileSync(path.join(targetDir, "app", "about", "page.tsx"), "utf-8");
      expect(tsx).not.toContain('"use client"');
      expect(tsx).toContain("export const metadata");
    });

    it("declares a submit stub for every form so the page has no undefined identifier", async () => {
      await applyDesignDocumentPages(
        targetDir,
        documentWith([
          {
            id: "contact",
            title: "Contact",
            path: "/contact",
            sections: [
              {
                id: "s",
                type: "contact",
                components: [{ id: "f", type: "form", props: { fields: [{ name: "email" }] } }],
              },
            ],
          },
        ])
      );

      const tsx = fs.readFileSync(path.join(targetDir, "app", "contact", "page.tsx"), "utf-8");
      const referenced = /onSubmit=\{(\w+)\}/.exec(tsx)?.[1];

      expect(referenced).toBeTruthy();
      expect(tsx).toContain(`function ${referenced}() {`);
    });
  });
});
