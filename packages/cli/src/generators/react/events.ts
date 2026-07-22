import type { EventsContract } from "@cnbiz/design-system/types/design";
import type { ReactEventHandlers, ReactEventStub } from "./types.js";

/**
 * React Generator — Design JSON Standardization Phase 8.
 * Converts Phase 7.5's EventsContract into TODO-stub React event handler names + Tailwind
 * classes. `onClick`/`hover`/`focus` are action IDENTIFIERS (strings), not executable code
 * (see docs/architecture/DESIGN_JSON_SPEC.md's Events section) — this module never interprets
 * or implements the referenced action, it only names a stub function for it. `animation`/
 * `transition` describe CSS-level effects, not event bindings, so they become Tailwind classes
 * instead (matching this repo's own transition convention, CNBIZ_RULES.md 4.5).
 */

export interface EventBuildResult {
  handlers: ReactEventHandlers;
  stubs: ReactEventStub[];
  /** Tailwind classes derived from `animation`/`transition` (appended to the component's className). */
  classes: string[];
}

function slugify(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]+/g, "_");
}

const EMPTY_RESULT: EventBuildResult = { handlers: {}, stubs: [], classes: [] };

export function buildEvents(componentId: string, events?: EventsContract): EventBuildResult {
  if (!events) return EMPTY_RESULT;

  const idSlug = slugify(componentId);
  const handlers: ReactEventHandlers = {};
  const stubs: ReactEventStub[] = [];
  const classes: string[] = [];

  if (events.onClick) {
    const name = `handleClick_${idSlug}`;
    handlers.onClick = name;
    stubs.push({ name, sourceAction: events.onClick });
  }
  if (events.hover) {
    const name = `handleHover_${idSlug}`;
    handlers.onMouseEnter = name;
    stubs.push({ name, sourceAction: events.hover });
  }
  if (events.focus) {
    const name = `handleFocus_${idSlug}`;
    handlers.onFocus = name;
    stubs.push({ name, sourceAction: events.focus });
  }

  if (events.transition) {
    const durationMs = events.transition.durationMs ?? 200;
    classes.push("transition-all", `duration-[${durationMs}ms]`);
  }
  if (events.animation) {
    const name = (events.animation.name ?? "fade-in").trim().replace(/\s+/g, "_");
    const durationMs = events.animation.durationMs ?? 300;
    const easing = (events.animation.easing ?? "ease-out").trim().replace(/\s+/g, "_");
    classes.push(`animate-[${name}_${durationMs}ms_${easing}]`);
  }

  return { handlers, stubs, classes };
}
