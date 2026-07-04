import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
}

export function Textarea({ label, id, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-900">
        {label}
      </label>
      <textarea
        id={id}
        className={[
          "rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    </div>
  );
}
