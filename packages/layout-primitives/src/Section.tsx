import type { HTMLAttributes } from "react";

type SectionBackground = "white" | "alt" | "dark";

const BACKGROUND_STYLES: Record<SectionBackground, string> = {
  white: "bg-white text-slate-900",
  alt: "bg-slate-50 text-slate-900",
  dark: "bg-slate-900 text-white",
};

interface SectionProps extends HTMLAttributes<HTMLElement> {
  background?: SectionBackground;
}

export function Section({ background = "white", className, ...props }: SectionProps) {
  return (
    <section
      className={["py-24", BACKGROUND_STYLES[background], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
