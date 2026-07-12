import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { CTA } from "@/components/CTA";
import { content } from "@/lib/content";

export const metadata: Metadata = {
  title: content.services.title,
  description: content.services.intro
};

export default function ServicesPage() {
  return (
    <>
      <Hero title={content.services.title} subtitle={content.services.intro} />
      <section className="py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 sm:grid-cols-2">
          {content.services.items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-background p-8 shadow-sm">
              <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
      <CTA title="Ready to get started?" ctaLabel="Contact Us" />
    </>
  );
}
