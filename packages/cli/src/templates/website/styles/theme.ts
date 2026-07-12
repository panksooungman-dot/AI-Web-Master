import { breakpoints, colors, layout, radius, typography } from "./tokens";

/**
 * Semantic theme for {{projectName}} ({{siteTypeLabel}}). Combines the raw tokens in
 * ./tokens.ts with site identity so components can import one thing (`theme`) instead
 * of reaching into individual token files.
 */
export const theme = {
  name: "{{projectName}}",
  type: "{{siteType}}",
  colors,
  typography,
  layout,
  radius,
  breakpoints
} as const;

export type Theme = typeof theme;
