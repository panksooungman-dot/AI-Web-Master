import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary";

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary: "bg-white border border-slate-200 text-primary hover:bg-slate-50",
};

const BASE_STYLES =
  "inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

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
