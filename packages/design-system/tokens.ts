/**
 * Design tokens per DESIGN_SYSTEM.md / CNBIZ_RULES.md.
 * Color values are also encoded as CSS variables in ./theme.css — keep both in sync.
 */

export const colors = {
  primary: "#005BAC",
  primaryLight: "#4F9DE0",
  primaryDark: "#00498A",
  secondary: "#1F2937",
  background: "#FFFFFF",
  text: "#111827",
} as const;

export const typography = {
  h1: "text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight",
  h2: "text-3xl sm:text-4xl font-bold leading-tight",
  h3: "text-lg font-bold",
  body: "text-base leading-relaxed text-slate-600",
  small: "text-sm text-slate-600",
  label: "text-sm font-semibold tracking-widest uppercase text-primary",
} as const;

export const layout = {
  maxWidth: "1280px",
  sectionPaddingY: "80px",
} as const;

export const radius = {
  button: "8px",
  card: "12px",
} as const;

export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const;
