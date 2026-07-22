import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  generateReactComponentTree,
  pathToRoute,
  buildTailwindClasses,
} from "../../packages/cli/src/generators/react/index.js";
import type { DesignDocument } from "@cnbiz/design-system/types/design";

const REACT_GENERATOR_SRC_DIR = path.join(__dirname, "..", "..", "packages", "cli", "src", "generators", "react");

function baseDocument(overrides: Partial<DesignDocument> = {}): DesignDocument {
  return {
    version: "1.0.0",
    metadata: {
      projectName: "Acme Site",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    theme: { colors: {}, typography: {}, spacing: {}, radius: {}, shadow: {} },
    pages: [],
    ...overrides,
  };
}

describe("React Generator — packages/cli/src/generators/react", () => {
  describe("purity / isolation (mirrors the task's 'DesignDocument only' requirement)", () => {
    it("generateReactComponentTree() is deterministic — same input produces an identical (deep-equal) tree", () => {
      const document = baseDocument({
        pages: [
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [
              {
                id: "hero",
                type: "hero",
                components: [{ id: "cta", type: "button", props: { text: "Go" } }],
              },
            ],
          },
        ],
      });

      const first = generateReactComponentTree(document);
      const second = generateReactComponentTree(document);
      expect(first).toEqual(second);
    });

    it("never touches the filesystem — no fs import anywhere under generators/react", () => {
      const files = fs.readdirSync(REACT_GENERATOR_SRC_DIR).filter((name) => name.endsWith(".ts"));
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const content = fs.readFileSync(path.join(REACT_GENERATOR_SRC_DIR, file), "utf-8");
        expect(content).not.toMatch(/from ["']fs["']/);
        expect(content).not.toMatch(/from ["']fs-extra["']/);
      }
    });

    it("never imports another Generator/Adapter/Registry (Planning/Storyboard/Wireframe/Prototype/Claude Design/Website Builder)", () => {
      const files = fs.readdirSync(REACT_GENERATOR_SRC_DIR).filter((name) => name.endsWith(".ts"));

      for (const file of files) {
        const content = fs.readFileSync(path.join(REACT_GENERATOR_SRC_DIR, file), "utf-8");
        expect(content).not.toMatch(/apps\/cnbiz-web/);
        expect(content).not.toMatch(/lib\/design/);
        expect(content).not.toMatch(/website-build/);
        expect(content).not.toMatch(/DesignPlanRecord|StoryboardRecord|WireframeRecord|PrototypeRecord|ClaudeDesignRecord/);
      }
    });

    it("only imports types (never runtime values) from @cnbiz/design-system — compiled output has zero runtime coupling", () => {
      const files = fs.readdirSync(REACT_GENERATOR_SRC_DIR).filter((name) => name.endsWith(".ts"));

      for (const file of files) {
        const content = fs.readFileSync(path.join(REACT_GENERATOR_SRC_DIR, file), "utf-8");
        const designSystemImports = content.match(/^import .*@cnbiz\/design-system.*$/gm) ?? [];
        for (const line of designSystemImports) {
          expect(line).toMatch(/^import type /);
        }
      }
    });
  });

  describe("pathToRoute()", () => {
    it("maps the home path to app/page.tsx", () => {
      expect(pathToRoute("/")).toBe("app/page.tsx");
    });

    it("maps nested paths to nested App Router routes", () => {
      expect(pathToRoute("/about")).toBe("app/about/page.tsx");
      expect(pathToRoute("/services/pricing")).toBe("app/services/pricing/page.tsx");
    });
  });

  describe("buildTailwindClasses()", () => {
    it("converts layout fields into Tailwind classes", () => {
      const classes = buildTailwindClasses({
        direction: "row",
        gap: "16px",
        align: "center",
        justify: "space-between",
        width: "100%",
        maxWidth: "1280px",
      });

      expect(classes).toContain("flex");
      expect(classes).toContain("flex-row");
      expect(classes).toContain("gap-[16px]");
      expect(classes).toContain("items-center");
      expect(classes).toContain("justify-between");
      expect(classes).toContain("w-[100%]");
      expect(classes).toContain("max-w-[1280px]");
    });

    it("prefers grid over flex when columns is set", () => {
      const classes = buildTailwindClasses({ columns: 12, rows: 2, direction: "row" });
      expect(classes).toContain("grid");
      expect(classes).toContain("grid-cols-12");
      expect(classes).toContain("grid-rows-2");
      expect(classes).not.toContain("flex-row");
    });

    it("converts style fields into Tailwind arbitrary-value classes", () => {
      const classes = buildTailwindClasses(undefined, {
        margin: "0 auto",
        padding: "24px",
        radius: "12px",
        shadow: "0 4px 6px rgba(0,0,0,0.1)",
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        opacity: 0.9,
      });

      expect(classes).toContain("m-[0_auto]");
      expect(classes).toContain("p-[24px]");
      expect(classes).toContain("rounded-[12px]");
      expect(classes).toContain("bg-[#FFFFFF]");
      expect(classes).toContain("border");
      expect(classes).toContain("opacity-[0.9]");
    });

    it("layers responsive overrides with sm:/lg: prefixes (mobile-first, no prefix for mobile)", () => {
      const classes = buildTailwindClasses(undefined, undefined, {
        mobile: { layout: { direction: "column" } },
        tablet: { layout: { columns: 8 } },
        desktop: { layout: { columns: 12 } },
      });

      expect(classes).toContain("flex-col");
      expect(classes).toContain("sm:grid-cols-8");
      expect(classes).toContain("lg:grid-cols-12");
    });
  });

  describe("generateReactComponentTree() — component mapping", () => {
    it("maps every ComponentType to a resolved tag", () => {
      const document = baseDocument({
        pages: [
          {
            id: "kitchen-sink",
            title: "Kitchen Sink",
            path: "/kitchen-sink",
            sections: [
              {
                id: "sec",
                type: "about",
                components: [
                  { id: "c-heading", type: "heading", props: {} },
                  { id: "c-text", type: "text", props: {} },
                  { id: "c-button", type: "button", props: {} },
                  { id: "c-image", type: "image", props: {} },
                  { id: "c-icon", type: "icon", props: {} },
                  { id: "c-card", type: "card", props: {} },
                  { id: "c-form", type: "form", props: {} },
                  { id: "c-input", type: "input", props: {} },
                  { id: "c-textarea", type: "textarea", props: {} },
                  { id: "c-checkbox", type: "checkbox", props: {} },
                  { id: "c-radio", type: "radio", props: {} },
                  { id: "c-select", type: "select", props: {} },
                  { id: "c-video", type: "video", props: {} },
                  { id: "c-map", type: "map", props: {} },
                  { id: "c-divider", type: "divider", props: {} },
                  { id: "c-container", type: "container", props: {} },
                  { id: "c-grid", type: "grid", props: {} },
                  { id: "c-navbar", type: "navbar", props: {} },
                ],
              },
            ],
          },
        ],
      });

      const tree = generateReactComponentTree(document);
      const tags = tree.pages[0].sections[0].components.map((c) => c.tag);

      expect(tags).toEqual([
        "h2", "p", "button", "Image", "span", "div", "form", "input", "textarea",
        "input", "input", "select", "video", "div", "hr", "div", "div", "nav",
      ]);
    });

    it("preserves the original DesignDocument ComponentType as sourceType (traceability)", () => {
      const document = baseDocument({
        pages: [
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [{ id: "sec", type: "hero", components: [{ id: "c1", type: "card", props: { sourceType: "Card" } }] }],
          },
        ],
      });

      const tree = generateReactComponentTree(document);
      expect(tree.pages[0].sections[0].components[0].sourceType).toBe("card");
    });

    it("passes props through unmodified", () => {
      const document = baseDocument({
        pages: [
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [
              { id: "sec", type: "hero", components: [{ id: "c1", type: "button", props: { text: "Click me", disabled: true } }] },
            ],
          },
        ],
      });

      const tree = generateReactComponentTree(document);
      expect(tree.pages[0].sections[0].components[0].props).toEqual({ text: "Click me", disabled: true });
    });

    it("maps section types to section/footer tags", () => {
      const document = baseDocument({
        pages: [
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [
              { id: "s1", type: "hero", components: [] },
              { id: "s2", type: "footer", components: [] },
            ],
          },
        ],
      });

      const tree = generateReactComponentTree(document);
      expect(tree.pages[0].sections[0].tag).toBe("section");
      expect(tree.pages[0].sections[1].tag).toBe("footer");
    });

    it("recursively maps Component.children into a nested tree", () => {
      const document = baseDocument({
        pages: [
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [
              {
                id: "sec",
                type: "hero",
                components: [
                  {
                    id: "outer",
                    type: "container",
                    props: {},
                    children: [
                      { id: "inner", type: "text", props: { text: "Hello" }, children: [{ id: "innermost", type: "icon", props: {} }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const tree = generateReactComponentTree(document);
      const outer = tree.pages[0].sections[0].components[0];
      expect(outer.children).toHaveLength(1);
      expect(outer.children[0].id).toBe("inner");
      expect(outer.children[0].children).toHaveLength(1);
      expect(outer.children[0].children[0].id).toBe("innermost");
    });
  });

  describe("generateReactComponentTree() — events (TODO stubs, no business logic)", () => {
    it("onClick/hover/focus become distinct stub handler names embedded in the rendered TSX", () => {
      const document = baseDocument({
        pages: [
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [
              {
                id: "sec",
                type: "hero",
                components: [
                  {
                    id: "cta",
                    type: "button",
                    props: { text: "Go" },
                    events: { onClick: "navigate:/contact", hover: "highlight", focus: "outline" },
                  },
                ],
              },
            ],
          },
        ],
      });

      const tree = generateReactComponentTree(document);
      const node = tree.pages[0].sections[0].components[0];

      expect(node.events.onClick).toBe("handleClick_cta");
      expect(node.events.onMouseEnter).toBe("handleHover_cta");
      expect(node.events.onFocus).toBe("handleFocus_cta");

      const tsx = tree.pages[0].tsx;
      expect(tsx).toContain("function handleClick_cta() {");
      expect(tsx).toContain('// TODO: implement "navigate:/contact"');
      expect(tsx).toContain("function handleHover_cta() {");
      expect(tsx).toContain("function handleFocus_cta() {");
      // No implementation is ever generated beyond the TODO comment.
      expect(tsx.match(/function handleClick_cta\(\) \{\n\s*\/\/ TODO[^]*?\n\}/)).not.toBeNull();
    });

    it("animation/transition become Tailwind classes, not event handlers", () => {
      const document = baseDocument({
        pages: [
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [
              {
                id: "sec",
                type: "hero",
                components: [
                  {
                    id: "card",
                    type: "card",
                    props: {},
                    events: {
                      animation: { name: "fade in", durationMs: 300, easing: "ease out" },
                      transition: { property: "transform", durationMs: 150 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

      const tree = generateReactComponentTree(document);
      const node = tree.pages[0].sections[0].components[0];

      expect(node.events.onClick).toBeUndefined();
      expect(node.className).toContain("transition-all");
      expect(node.className).toContain("duration-[150ms]");
      expect(node.className).toContain("animate-[fade_in_300ms_ease_out]");
    });
  });

  describe("generateReactComponentTree() — TSX output (Next.js App Router)", () => {
    it("only imports Image/Link when actually used by a page's components", () => {
      const withImage = baseDocument({
        pages: [
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [{ id: "s", type: "hero", components: [{ id: "img", type: "image", props: { src: "/a.png", alt: "a" } }] }],
          },
        ],
      });
      const withoutImageOrLink = baseDocument({
        pages: [
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [{ id: "s", type: "hero", components: [{ id: "txt", type: "text", props: { text: "hi" } }] }],
          },
        ],
      });

      expect(generateReactComponentTree(withImage).pages[0].tsx).toContain('import Image from "next/image";');
      expect(generateReactComponentTree(withoutImageOrLink).pages[0].tsx).not.toContain('import Image from "next/image";');
      expect(generateReactComponentTree(withoutImageOrLink).pages[0].tsx).not.toContain('import Link from "next/link";');
    });

    it("suggests a Next.js App Router route path per page without writing anything to disk", () => {
      const document = baseDocument({
        pages: [
          { id: "home", title: "Home", path: "/", sections: [] },
          { id: "about", title: "About", path: "/about", sections: [] },
        ],
      });

      const tree = generateReactComponentTree(document);
      expect(tree.pages[0].route).toBe("app/page.tsx");
      expect(tree.pages[1].route).toBe("app/about/page.tsx");
      expect(tree.pages.every((p) => typeof p.tsx === "string" && p.tsx.length > 0)).toBe(true);
    });

    it("renders a button with an href as a next/link Link, and a plain button otherwise", () => {
      const document = baseDocument({
        pages: [
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [
              {
                id: "s",
                type: "hero",
                components: [
                  { id: "link-btn", type: "button", props: { text: "Contact", href: "/contact" } },
                  { id: "plain-btn", type: "button", props: { text: "Submit" } },
                ],
              },
            ],
          },
        ],
      });

      const tsx = generateReactComponentTree(document).pages[0].tsx;
      expect(tsx).toContain('<Link href={"/contact"}');
      expect(tsx).toContain("<button");
    });

    it("safely embeds text containing quotes/braces without corrupting the generated TSX", () => {
      const document = baseDocument({
        pages: [
          {
            id: "home",
            title: "Home",
            path: "/",
            sections: [
              {
                id: "s",
                type: "hero",
                components: [{ id: "t", type: "text", props: { text: `Say "hi" { welcome }` } }],
              },
            ],
          },
        ],
      });

      const tsx = generateReactComponentTree(document).pages[0].tsx;
      expect(tsx).toContain(JSON.stringify(`Say "hi" { welcome }`));
    });
  });
});
