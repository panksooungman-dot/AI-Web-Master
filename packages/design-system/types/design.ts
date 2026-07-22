/**
 * AI Business OS
 * Design Document Type Definition
 * Version: 1.1.0
 *
 * Phase 7.5 (Design JSON Standardization — docs/architecture/DESIGN_JSON_SPEC.md) extends this
 * document from a pure Content Model to a Rendering Contract a future React Generator can consume
 * directly, WITHOUT changing anything that already existed: every new field below is optional and
 * every pre-existing field/shape is untouched. A `DesignDocument` produced before this phase (e.g.
 * `{version, metadata, theme, pages: [{id, title, path, sections: []}]}`) remains a fully valid
 * `DesignDocument` after this phase — it simply doesn't use the new rendering fields yet.
 */

export interface DesignDocument {
  version: string;
  metadata: Metadata;
  theme: Theme;
  pages: Page[];
}

export interface Metadata {
  projectId?: string;
  projectName: string;
  clientName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Theme {
  colors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, string>;
}

export interface Page {
  id: string;
  title: string;
  path: string;
  sections: Section[];
  /** Rendering Contract (Phase 7.5, optional) — page-level arrangement of its sections. */
  layout?: LayoutContract;
  /** Rendering Contract (Phase 7.5, optional) — per-breakpoint layout overrides. */
  responsive?: ResponsiveConfig;
}

export interface Section {
  id: string;
  type: SectionType;
  components: Component[];
  /** Rendering Contract (Phase 7.5, optional) — arrangement of this section's components. */
  layout?: LayoutContract;
  /** Rendering Contract (Phase 7.5, optional) — this section's visual style. */
  style?: StyleContract;
  /** Rendering Contract (Phase 7.5, optional) — per-breakpoint layout/style overrides. */
  responsive?: ResponsiveConfig;
}

/**
 * `TProps` defaults to `Record<string, unknown>` — every pre-7.5 usage of the bare `Component`
 * type (e.g. `Component[]`) continues to resolve exactly as before. Pass one of the recommended
 * per-type Props interfaces below (e.g. `Component<ButtonProps>`) for stricter typing where useful;
 * this is optional, not required — `props` itself is still a plain object at the schema level.
 */
export interface Component<TProps extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: ComponentType;
  props: TProps;
  /** Rendering Contract (Phase 7.5, optional) — nested Component Tree. */
  children?: Component[];
  /** Rendering Contract (Phase 7.5, optional) — this component's visual style. */
  style?: StyleContract;
  /** Rendering Contract (Phase 7.5, optional) — arrangement of this component's own children. */
  layout?: LayoutContract;
  /** Rendering Contract (Phase 7.5, optional) — per-breakpoint layout/style overrides. */
  responsive?: ResponsiveConfig;
  /** Rendering Contract (Phase 7.5, optional) — Interaction Contract. */
  events?: EventsContract;
}

export type SectionType =
  | "hero"
  | "about"
  | "services"
  | "portfolio"
  | "gallery"
  | "pricing"
  | "faq"
  | "testimonial"
  | "contact"
  | "footer";

export type ComponentType =
  | "heading"
  | "text"
  | "button"
  | "image"
  | "icon"
  | "card"
  | "form"
  | "input"
  | "textarea"
  | "checkbox"
  | "radio"
  | "select"
  | "video"
  | "map"
  | "divider"
  | "container"
  | "grid"
  /** Rendering Contract (Phase 7.5, additive) — site navigation bar. */
  | "navbar";

// ---------------------------------------------------------------------------
// Rendering Contract — Layout (Phase 7.5)
// Attached to Page/Section/Component. Describes how a node arranges its own
// children — not how its parent positions the node itself.
// ---------------------------------------------------------------------------

export type LayoutDirection = "row" | "column";

export type LayoutAlign = "start" | "center" | "end" | "stretch" | "baseline";

export type LayoutJustify = "start" | "center" | "end" | "space-between" | "space-around" | "space-evenly";

export interface LayoutContract {
  direction?: LayoutDirection;
  columns?: number;
  rows?: number;
  gap?: string;
  align?: LayoutAlign;
  justify?: LayoutJustify;
  width?: string;
  maxWidth?: string;
}

// ---------------------------------------------------------------------------
// Rendering Contract — Style (Phase 7.5)
// ---------------------------------------------------------------------------

export interface StyleContract {
  margin?: string;
  padding?: string;
  radius?: string;
  shadow?: string;
  background?: string;
  border?: string;
  opacity?: number;
}

// ---------------------------------------------------------------------------
// Rendering Contract — Responsive (Phase 7.5)
// Breakpoint names match the Wireframe Generator's existing desktop/tablet/
// mobile breakpoint model (lib/design/wireframe.ts's `Breakpoint`) — same
// concept, now expressed at the DesignDocument level.
// ---------------------------------------------------------------------------

export interface ResponsiveVariant {
  layout?: LayoutContract;
  style?: StyleContract;
}

export interface ResponsiveConfig {
  desktop?: ResponsiveVariant;
  tablet?: ResponsiveVariant;
  mobile?: ResponsiveVariant;
}

// ---------------------------------------------------------------------------
// Rendering Contract — Events / Interaction (Phase 7.5)
// `onClick`/`hover`/`focus` are action identifiers (e.g. "navigate:/contact",
// "openModal:signup") rather than executable code — DesignDocument is a plain
// JSON document (see design.schema.json), not a code artifact.
// ---------------------------------------------------------------------------

export interface AnimationSpec {
  name?: string;
  durationMs?: number;
  easing?: string;
}

export interface TransitionSpec {
  property?: string;
  durationMs?: number;
  easing?: string;
}

export interface EventsContract {
  onClick?: string;
  hover?: string;
  focus?: string;
  animation?: AnimationSpec;
  transition?: TransitionSpec;
}

// ---------------------------------------------------------------------------
// Rendering Contract — Recommended Props per ComponentType (Phase 7.5)
// These are recommended shapes for `Component<TProps>`, not enforced ones —
// `Component.props` remains `Record<string, unknown>` by default so every
// existing producer of Component objects (untyped props) keeps compiling
// unchanged. A React Generator (or any stricter consumer) can opt in via
// `Component<ButtonProps>`, `Component<ImageProps>`, etc.
// ---------------------------------------------------------------------------

export interface ButtonProps extends Record<string, unknown> {
  text?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: string;
  href?: string;
  disabled?: boolean;
}

export interface ImageProps extends Record<string, unknown> {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

export interface FormFieldSpec {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

export interface FormProps extends Record<string, unknown> {
  fields?: FormFieldSpec[];
  submitAction?: string;
  validation?: Record<string, string>;
}

export interface NavbarProps extends Record<string, unknown> {
  items?: Array<{ label: string; href: string }>;
  logo?: string;
  sticky?: boolean;
}
