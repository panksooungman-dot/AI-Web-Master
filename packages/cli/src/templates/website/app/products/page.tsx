import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { CTA } from "@/components/CTA";
import { content } from "@/lib/content";

export const metadata: Metadata = {
  title: content.products.title,
  description: content.products.intro
};

export default function ProductsPage() {
  return (
    <>
      <Hero title={content.products.title} subtitle={content.products.intro} />
      <section className="py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {content.products.items.map((item) => (
            <div key={item.name} className="flex flex-col rounded-2xl border border-border bg-background p-8 shadow-sm">
              <h3 className="text-xl font-bold text-foreground">{item.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/70">{item.description}</p>
              <p className="mt-4 text-sm font-semibold text-primary">{item.price}</p>
            </div>
          ))}
        </div>
      </section>
      <CTA title="Interested in learning more?" />
    </>
  );
}
