import Link from "next/link";

interface CTAProps {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function CTA({ title, subtitle, ctaLabel = "Get in Touch", ctaHref = "/contact" }: CTAProps) {
  return (
    <section className="bg-secondary py-16 sm:py-20">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-6 text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">{title}</h2>
        {subtitle && <p className="max-w-xl text-white/70">{subtitle}</p>}
        <Link
          href={ctaHref}
          className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
