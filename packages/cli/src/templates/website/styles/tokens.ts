/**
 * Design tokens for {{projectName}}. Keep color values in sync with ./theme.css —
 * the CSS custom properties there are the source of truth for what actually renders.
 */

export const colors = {
  primary: "{{colorPrimary}}",
  primaryDark: "{{colorPrimaryDark}}",
  secondary: "{{colorSecondary}}",
  accent: "{{colorAccent}}",
  background: "{{colorBackground}}",
  foreground: "{{colorForeground}}",
  muted: "{{colorMuted}}",
  border: "{{colorBorder}}",
  success: "{{colorSuccess}}",
  warning: "{{colorWarning}}",
  danger: "{{colorDanger}}"
} as const;

export const typography = {
  h1: "text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight",
  h2: "text-3xl sm:text-4xl font-bold leading-tight",
  h3: "text-xl font-bold",
  body: "text-base leading-relaxed text-foreground/70",
  small: "text-sm text-foreground/60",
  label: "text-sm font-semibold tracking-widest uppercase text-primary"
} as const;

export const layout = {
  maxWidth: "1280px",
  sectionPaddingY: "6rem"
} as const;

export const radius = {
  button: "9999px",
  card: "1rem"
} as const;

export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024
} as const;
