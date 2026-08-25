import type { HTMLAttributes } from "react";

type SectionBackground = "white" | "alt" | "dark";

const BACKGROUND_STYLES: Record<SectionBackground, string> = {
  white: "bg-white text-slate-900",
  alt: "bg-slate-50 text-slate-900",
  dark: "bg-slate-900 text-white",
};

const BLEND_FROM_STYLES: Record<SectionBackground, string> = {
  white: "from-white",
  alt: "from-slate-50",
  dark: "from-slate-900",
};

interface SectionProps extends HTMLAttributes<HTMLElement> {
  background?: SectionBackground;
  /**
   * Previous section's background. When set, renders a soft gradient wash at the top edge that
   * blends from that color into this section's own background, so the seam between sections
   * reads as a smooth transition instead of a hard cut.
   */
  blendFrom?: SectionBackground;
}

export function Section({ background = "white", blendFrom, className, children, ...props }: SectionProps) {
  return (
    <section
      className={["relative py-24", BACKGROUND_STYLES[background], className].filter(Boolean).join(" ")}
      {...props}
    >
      {blendFrom && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b sm:h-32 ${BLEND_FROM_STYLES[blendFrom]} to-transparent`}
        />
      )}
      {children}
    </section>
  );
}
