import type { DesignDocument } from "@cnbiz/design-system/types/design";
import { mapDesignDocument } from "./componentTree.js";
import { renderPageTsx } from "./tsx.js";
import type { ReactComponentTree, ReactPageNode } from "./types.js";

/**
 * React Generator — Design JSON Standardization Phase 8
 * (docs/architecture/DESIGN_JSON_SPEC.md).
 *
 * DesignDocument → React Component Tree → Next.js (App Router) TSX text.
 *
 * - Input: a single `DesignDocument` (packages/design-system/types/design.ts). Nothing else —
 *   no Adapter, no Registry, no other Generator (Planning/Storyboard/Wireframe/Prototype/Claude
 *   Design/Website Builder) is read or imported by this module.
 * - Output: a `ReactComponentTree` (structured tree + rendered TSX text per page), returned as a
 *   plain value. This function never touches the filesystem — no files are written.
 * - Pure function: same `DesignDocument` in → same `ReactComponentTree` out, every time.
 */
export function generateReactComponentTree(document: DesignDocument): ReactComponentTree {
  const mapped = mapDesignDocument(document);

  const pages: ReactPageNode[] = mapped.pages.map(({ structure, stubs }) => ({
    ...structure,
    tsx: renderPageTsx(structure, stubs),
  }));

  return { version: mapped.version, pages };
}

export * from "./types.js";
export { pathToRoute } from "./componentTree.js";
export { buildTailwindClasses, layoutToClasses, styleToClasses } from "./tailwind.js";
export { COMPONENT_TAG_MAP, SECTION_TAG_MAP, SECTION_BASE_CLASS } from "./componentMap.js";
