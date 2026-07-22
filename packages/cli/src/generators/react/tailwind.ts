import type { LayoutContract, ResponsiveConfig, StyleContract } from "@cnbiz/design-system/types/design";

/**
 * React Generator — Design JSON Standardization Phase 8.
 * Pure helpers converting Phase 7.5's Rendering Contract (LayoutContract/StyleContract/
 * ResponsiveConfig) into Tailwind utility class strings. This is a deterministic, best-effort
 * mapping (documented in docs/architecture/DESIGN_JSON_SPEC.md) — not a full CSS engine. Raw CSS
 * values (e.g. "16px", "#FFFFFF") are passed through Tailwind's arbitrary-value syntax
 * (`gap-[16px]`) rather than being parsed/rounded to Tailwind's default scale.
 *
 * Breakpoint prefixes follow this repo's own convention
 * (docs/02_DEVELOPMENT/CNBIZ_RULES.md 4.3 — 기본=모바일, sm=태블릿(640px), lg=데스크탑(1024px)):
 * mobile → no prefix (base, mobile-first), tablet → `sm:`, desktop → `lg:`.
 */

const LAYOUT_ALIGN_CLASS: Record<NonNullable<LayoutContract["align"]>, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const LAYOUT_JUSTIFY_CLASS: Record<NonNullable<LayoutContract["justify"]>, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  "space-between": "justify-between",
  "space-around": "justify-around",
  "space-evenly": "justify-evenly",
};

/** Tailwind arbitrary values can't contain raw spaces — replace with `_` per Tailwind's own convention. */
function toArbitraryValue(value: string): string {
  return value.trim().replace(/\s+/g, "_");
}

export function layoutToClasses(layout?: LayoutContract): string[] {
  if (!layout) return [];
  const classes: string[] = [];

  // `columns` implies a CSS grid; otherwise fall back to `direction`'s flex layout.
  if (typeof layout.columns === "number") {
    classes.push("grid", `grid-cols-${layout.columns}`);
    if (typeof layout.rows === "number") classes.push(`grid-rows-${layout.rows}`);
  } else if (layout.direction) {
    classes.push("flex", layout.direction === "row" ? "flex-row" : "flex-col");
  }

  if (layout.gap) classes.push(`gap-[${toArbitraryValue(layout.gap)}]`);
  if (layout.align) classes.push(LAYOUT_ALIGN_CLASS[layout.align]);
  if (layout.justify) classes.push(LAYOUT_JUSTIFY_CLASS[layout.justify]);
  if (layout.width) classes.push(`w-[${toArbitraryValue(layout.width)}]`);
  if (layout.maxWidth) classes.push(`max-w-[${toArbitraryValue(layout.maxWidth)}]`);

  return classes;
}

export function styleToClasses(style?: StyleContract): string[] {
  if (!style) return [];
  const classes: string[] = [];

  if (style.margin) classes.push(`m-[${toArbitraryValue(style.margin)}]`);
  if (style.padding) classes.push(`p-[${toArbitraryValue(style.padding)}]`);
  if (style.radius) classes.push(`rounded-[${toArbitraryValue(style.radius)}]`);
  if (style.shadow) classes.push(`shadow-[${toArbitraryValue(style.shadow)}]`);
  if (style.background) classes.push(`bg-[${toArbitraryValue(style.background)}]`);
  // Tailwind's arbitrary-value syntax targets single CSS properties, not the `border` shorthand
  // (width/style/color combined) — so a truthy `border` value only adds the generic utility.
  if (style.border) classes.push("border");
  if (typeof style.opacity === "number") classes.push(`opacity-[${style.opacity}]`);

  return classes;
}

/**
 * Merges a node's own layout/style with its optional per-breakpoint overrides
 * (ResponsiveConfig) into a single Tailwind class string. `mobile` overrides merge into the
 * unprefixed base (mobile-first), `tablet` gets `sm:`, `desktop` gets `lg:`.
 */
export function buildTailwindClasses(
  layout?: LayoutContract,
  style?: StyleContract,
  responsive?: ResponsiveConfig
): string {
  const classes = [...layoutToClasses(layout), ...styleToClasses(style)];

  if (responsive?.mobile) {
    classes.push(...layoutToClasses(responsive.mobile.layout), ...styleToClasses(responsive.mobile.style));
  }
  if (responsive?.tablet) {
    const tabletClasses = [...layoutToClasses(responsive.tablet.layout), ...styleToClasses(responsive.tablet.style)];
    classes.push(...tabletClasses.map((cls) => `sm:${cls}`));
  }
  if (responsive?.desktop) {
    const desktopClasses = [...layoutToClasses(responsive.desktop.layout), ...styleToClasses(responsive.desktop.style)];
    classes.push(...desktopClasses.map((cls) => `lg:${cls}`));
  }

  return [...new Set(classes)].join(" ");
}
