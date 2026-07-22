import type { ComponentType, SectionType } from "@cnbiz/design-system/types/design";

/**
 * React Generator — Design JSON Standardization Phase 8.
 * Deterministic mapping tables from DesignDocument's fixed vocabularies (ComponentType/
 * SectionType) to React/HTML tags and baseline Tailwind classes. Pure data, no logic.
 */

/** Section wrapper tag. Content sections render as `<section>`; footer is semantically `<footer>`. */
export const SECTION_TAG_MAP: Record<SectionType, string> = {
  hero: "section",
  about: "section",
  services: "section",
  portfolio: "section",
  gallery: "section",
  pricing: "section",
  faq: "section",
  testimonial: "section",
  contact: "section",
  footer: "footer",
};

/**
 * Baseline Tailwind classes per SectionType, following this repo's own established convention
 * (docs/03_DESIGN/DESIGN_SYSTEM.md — 섹션 상하 패딩 py-24, 좌우 컨텐츠는 max-w-7xl mx-auto).
 * These are a starting point only — a node's own `layout`/`style`/`responsive` (via tailwind.ts)
 * are appended after these and can override/extend them.
 */
export const SECTION_BASE_CLASS: Record<SectionType, string> = {
  hero: "py-24",
  about: "py-24",
  services: "py-24",
  portfolio: "py-24",
  gallery: "py-24",
  pricing: "py-24",
  faq: "py-24",
  testimonial: "py-24",
  contact: "py-24",
  footer: "py-12",
};

/** Resolved React/HTML tag per ComponentType. */
export const COMPONENT_TAG_MAP: Record<ComponentType, string> = {
  heading: "h2",
  text: "p",
  button: "button",
  image: "Image",
  icon: "span",
  card: "div",
  form: "form",
  input: "input",
  textarea: "textarea",
  checkbox: "input",
  radio: "input",
  select: "select",
  video: "video",
  map: "div",
  divider: "hr",
  container: "div",
  grid: "div",
  navbar: "nav",
};

/** ComponentTypes that map to a self-closing/void HTML tag (no children rendered). */
export const VOID_COMPONENT_TYPES: ReadonlySet<ComponentType> = new Set(["input", "divider", "image"]);
