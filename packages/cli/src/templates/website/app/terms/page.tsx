import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { content } from "@/lib/content";

export const metadata: Metadata = {
  title: content.terms.title,
  description: content.terms.title
};

export default function TermsPage() {
  return (
    <>
      <Hero title={content.terms.title} />
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-3xl space-y-6 px-6">
          {content.terms.body.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="text-sm leading-relaxed text-foreground/70">
              {paragraph}
            </p>
          ))}
        </div>
      </section>
    </>
  );
}
