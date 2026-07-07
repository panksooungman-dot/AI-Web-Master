import type { HTMLAttributes, ReactNode } from "react";
import { componentMarker } from "@/lib/dev/component-marker";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "panel" | "console";
}

const VARIANT_BACKGROUND: Record<NonNullable<CardProps["variant"]>, string> = {
  panel: "bg-gray-900",
  console: "bg-black",
};

export function Card({
  title,
  actions,
  children,
  className,
  variant = "panel",
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-700 ${VARIANT_BACKGROUND[variant]} p-5 shadow-xl ${className ?? ""}`}
      {...componentMarker("Card", "components/developer/Card.tsx")}
      {...rest}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
