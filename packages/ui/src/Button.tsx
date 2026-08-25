import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary";

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-dark hover:shadow-md hover:shadow-primary/25",
  secondary: "bg-white border border-slate-200 text-primary hover:border-slate-300 hover:bg-slate-50",
};

const BASE_STYLES =
  "inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function buttonStyles(variant: ButtonVariant, className?: string) {
  return [BASE_STYLES, VARIANT_STYLES[variant], className].filter(Boolean).join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={buttonStyles(variant, className)} {...props} />;
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
}

export function LinkButton({ variant = "primary", className, href, ...props }: LinkButtonProps) {
  return <Link href={href} className={buttonStyles(variant, className)} {...props} />;
}
