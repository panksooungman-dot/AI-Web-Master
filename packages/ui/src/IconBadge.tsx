import type { HTMLAttributes } from "react";

export type IconBadgeTone = "blue" | "indigo" | "violet" | "cyan";
export type IconBadgeSize = "sm" | "md" | "lg";

const TONE_STYLES: Record<IconBadgeTone, string> = {
  blue: "from-primary-light/40 to-primary/20 text-primary",
  indigo: "from-indigo-300/50 to-indigo-500/25 text-indigo-600",
  violet: "from-violet-300/50 to-violet-500/25 text-violet-600",
  cyan: "from-cyan-300/50 to-cyan-500/25 text-cyan-600",
};

const TONE_STYLES_ON_DARK: Record<IconBadgeTone, string> = {
  blue: "from-primary-light/35 to-primary/20 text-primary-light",
  indigo: "from-indigo-300/35 to-indigo-500/20 text-indigo-300",
  violet: "from-violet-300/35 to-violet-500/20 text-violet-300",
  cyan: "from-cyan-300/35 to-cyan-500/20 text-cyan-300",
};

const SIZE_STYLES: Record<IconBadgeSize, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

interface IconBadgeProps extends HTMLAttributes<HTMLDivElement> {
  tone?: IconBadgeTone;
  size?: IconBadgeSize;
  /** Use the lighter-tinted variant designed to sit on a dark section background. */
  onDark?: boolean;
}

export function IconBadge({ tone = "blue", size = "md", onDark = false, className, ...props }: IconBadgeProps) {
  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-sm shadow-slate-900/5",
        SIZE_STYLES[size],
        onDark ? TONE_STYLES_ON_DARK[tone] : TONE_STYLES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
