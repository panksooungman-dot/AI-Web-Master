import Link from "next/link";

interface CtaLink {
  label: string;
  href: string;
}

interface HeroProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
}

export function Hero({ kicker, title, subtitle, primaryCta, secondaryCta }: HeroProps) {
  return (
    <section className="border-b border-border bg-muted">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-20 text-center sm:py-24">
        {kicker && <span className="text-sm font-semibold uppercase tracking-widest text-primary">{kicker}</span>}
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">{title}</h1>
        {subtitle && <p className="max-w-2xl text-lg leading-relaxed text-foreground/70">{subtitle}</p>}

        {(primaryCta || secondaryCta) && (
          <div className="flex flex-wrap items-center justify-center gap-4">
            {primaryCta && (
              <Link
                href={primaryCta.href}
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
