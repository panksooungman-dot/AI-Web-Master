import type { ReactNode } from "react";
import { componentMarker } from "@/lib/dev/component-marker";

export type BadgeTone =
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral"
  | "accent"
  | "purple"
  | "orange";

const TONE_STYLES: Record<BadgeTone, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  danger: "bg-red-500/10 text-red-400 border-red-500/30",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  info: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  neutral: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  accent: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  orange: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone, children, className }: BadgeProps) {
  return (
    <span
      className={`shrink-0 rounded border px-2 py-0.5 text-xs font-semibold ${TONE_STYLES[tone]} ${className ?? ""}`}
      {...componentMarker("Badge", "components/developer/Badge.tsx")}
    >
      {children}
    </span>
  );
}
