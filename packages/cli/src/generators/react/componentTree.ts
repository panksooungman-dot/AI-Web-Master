import type { Component, DesignDocument, Page, Section } from "@cnbiz/design-system/types/design";
import { COMPONENT_TAG_MAP, SECTION_BASE_CLASS, SECTION_TAG_MAP } from "./componentMap.js";
import { buildTailwindClasses } from "./tailwind.js";
import { buildEvents } from "./events.js";
import type { ReactComponentNode, ReactEventStub, ReactPageNode, ReactSectionNode } from "./types.js";

/**
 * React Generator — Design JSON Standardization Phase 8.
 * Pure recursive mapping: DesignDocument's Page/Section/Component (Content Model + Phase 7.5
 * Rendering Contract) → the intermediate React Component Tree (componentMap.ts's tag tables +
 * tailwind.ts's class builder + events.ts's TODO-stub builder). No JSX/TSX text is produced
 * here — see tsx.ts for that; this module only builds the structured tree.
 */

export type ReactPageStructure = Omit<ReactPageNode, "tsx">;

export interface ComponentMapResult {
  node: ReactComponentNode;
  stubs: ReactEventStub[];
}

function mapComponent(component: Component): ComponentMapResult {
  const tag = COMPONENT_TAG_MAP[component.type];
  const baseClass = buildTailwindClasses(component.layout, component.style, component.responsive);
  const { handlers, stubs, classes: eventClasses } = buildEvents(component.id, component.events);
  const className = [baseClass, ...eventClasses].filter(Boolean).join(" ");

  const childResults = (component.children ?? []).map(mapComponent);

  return {
    node: {
      id: component.id,
      tag,
      sourceType: component.type,
      className,
      props: component.props,
      events: handlers,
      children: childResults.map((result) => result.node),
    },
    stubs: [...stubs, ...childResults.flatMap((result) => result.stubs)],
  };
}

export interface SectionMapResult {
  node: ReactSectionNode;
  stubs: ReactEventStub[];
}

function mapSection(section: Section): SectionMapResult {
  const tag = SECTION_TAG_MAP[section.type];
  const responsiveClass = buildTailwindClasses(section.layout, section.style, section.responsive);
  const className = [SECTION_BASE_CLASS[section.type], responsiveClass].filter(Boolean).join(" ");

  const componentResults = section.components.map(mapComponent);

  return {
    node: {
      id: section.id,
      tag,
      sourceType: section.type,
      className,
      components: componentResults.map((result) => result.node),
    },
    stubs: componentResults.flatMap((result) => result.stubs),
  };
}

/** Next.js App Router convention: "/" → "app/page.tsx", "/about" → "app/about/page.tsx". */
export function pathToRoute(path: string): string {
  const trimmed = path.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `app/${trimmed}/page.tsx` : "app/page.tsx";
}

export interface PageMapResult {
  structure: ReactPageStructure;
  stubs: ReactEventStub[];
}

function mapPage(page: Page): PageMapResult {
  const className = buildTailwindClasses(page.layout, undefined, page.responsive);
  const sectionResults = page.sections.map(mapSection);

  return {
    structure: {
      id: page.id,
      title: page.title,
      path: page.path,
      route: pathToRoute(page.path),
      className,
      sections: sectionResults.map((result) => result.node),
    },
    stubs: sectionResults.flatMap((result) => result.stubs),
  };
}

export interface DocumentMapResult {
  version: string;
  pages: PageMapResult[];
}

/** Maps every page in the DesignDocument. Pure function — the only input is `document`. */
export function mapDesignDocument(document: DesignDocument): DocumentMapResult {
  return {
    version: document.version,
    pages: document.pages.map(mapPage),
  };
}
