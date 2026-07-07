import type { ReactNode } from "react";
import { componentMarker } from "@/lib/dev/component-marker";

interface StatusMessageProps {
  tone: "success" | "error";
  children: ReactNode;
  className?: string;
}

export function StatusMessage({ tone, children, className }: StatusMessageProps) {
  return (
    <p
      className={`text-sm ${tone === "success" ? "text-emerald-400" : "text-red-500"} ${className ?? ""}`}
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
