import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { CTA } from "@/components/CTA";
import { content } from "@/lib/content";

export const metadata: Metadata = {
  title: content.about.title,
  description: content.about.intro
};

export default function AboutPage() {
  return (
    <>
      <Hero title={content.about.title} subtitle={content.about.intro} />
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-lg leading-relaxed text-foreground/70">{content.about.body}</p>
        </div>
        <div className="mx-auto mt-16 grid w-full max-w-6xl gap-8 px-6 sm:grid-cols-3">
          {content.about.values.map((value) => (
            <div key={value.title} className="rounded-2xl border border-border bg-background p-8 shadow-sm">
              <h3 className="text-lg font-bold text-foreground">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">{value.description}</p>
            </div>
          ))}
        </div>
      </section>
      <CTA title="Let's work together" subtitle="Reach out and tell us about your goals." />
    </>
  );
}
