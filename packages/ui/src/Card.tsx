import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["rounded-xl border border-slate-100 bg-white p-6 shadow-md", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
