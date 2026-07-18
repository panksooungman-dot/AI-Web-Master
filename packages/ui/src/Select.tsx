import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  id: string;
}

export function Select({ label, id, className, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-900">
        {label}
      </label>
      <select
        id={id}
        className={[
          "rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
