/**
 * React Generator — Design JSON Standardization Phase 8
 * (docs/architecture/DESIGN_JSON_SPEC.md).
 *
 * Output contract: DesignDocument → React Component Tree → Next.js (App Router) TSX text.
 * This module only defines the intermediate/output shapes; the actual mapping logic lives in
 * componentMap.ts/tailwind.ts/events.ts/componentTree.ts/tsx.ts.
 */

/** Resolved Tailwind class list, already merged across base/tablet/desktop breakpoints. */
export type ClassName = string;

/**
 * TODO-stub event handlers attached to a rendered component. Values are the generated function
 * NAME (e.g. `"handleClick_hero_cta"`), not executable code — the actual function body is a
 * `// TODO: implement` stub emitted once per page (see tsx.ts). No business logic is generated.
 */
export interface ReactEventHandlers {
  onClick?: string;
  onMouseEnter?: string;
  onFocus?: string;
}

/** A single TODO-stub handler function to declare once at the top of a generated page component. */
export interface ReactEventStub {
  name: string;
  /** Original EventsContract action identifier this stub stands in for (traceability only). */
  sourceAction: string;
}

export interface ReactComponentNode {
  id: string;
  /** Resolved React/HTML tag or component name (e.g. "button", "Image", "nav"). */
  tag: string;
  /** Original DesignDocument ComponentType this node was mapped from (traceability). */
  sourceType: string;
  className: ClassName;
  /** Pass-through props from DesignDocument's Component.props, unmodified. */
  props: Record<string, unknown>;
  events: ReactEventHandlers;
  children: ReactComponentNode[];
}

export interface ReactSectionNode {
  id: string;
  /** "section" for content sections, "footer" for the footer SectionType. */
  tag: string;
  /** Original DesignDocument SectionType this node was mapped from (traceability). */
  sourceType: string;
  className: ClassName;
  components: ReactComponentNode[];
}

export interface ReactPageNode {
  id: string;
  title: string;
  /** Original DesignDocument page path (e.g. "/", "/about"). */
  path: string;
  /** Suggested Next.js App Router file location for this page (e.g. "app/about/page.tsx"). Not written to disk. */
  route: string;
  className: ClassName;
  sections: ReactSectionNode[];
  /** Rendered Next.js (App Router) TSX source text for this page — a string, never written to disk. */
  tsx: string;
}

export interface ReactComponentTree {
  /** Mirrors DesignDocument.version for traceability. */
  version: string;
  pages: ReactPageNode[];
}
