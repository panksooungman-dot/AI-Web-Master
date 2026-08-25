import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-900/5 transition-shadow duration-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
