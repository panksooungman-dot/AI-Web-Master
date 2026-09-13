import type { ReactNode } from "react";
import { componentMarker } from "@/lib/dev/component-marker";

interface StatusMessageProps {
  tone: "success" | "error" | "warning";
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<StatusMessageProps["tone"], string> = {
  success: "text-emerald-400",
  error: "text-red-500",
  warning: "text-amber-400",
};

export function StatusMessage({ tone, children, className }: StatusMessageProps) {
  return (
    <p
      className={`text-sm ${TONE_CLASSES[tone]} ${className ?? ""}`}
      {...componentMarker("StatusMessage", "components/developer/StatusMessage.tsx")}
    >
      {children}
    </p>
  );
}

export function LoadingText({ children = "Loading..." }: { children?: ReactNode }) {
  return (
    <p
      className="text-sm text-gray-500"
      {...componentMarker("LoadingText", "components/developer/StatusMessage.tsx")}
    >
      {children}
    </p>
  );
}
