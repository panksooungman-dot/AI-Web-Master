import type { TestimonialItem } from "@/lib/content";

export function Testimonials({ items }: { items: TestimonialItem[] }) {
  return (
    <section className="bg-muted py-20 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 sm:grid-cols-2">
        {items.map((item) => (
          <figure key={item.author} className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            <blockquote className="text-lg leading-relaxed text-foreground/80">&ldquo;{item.quote}&rdquo;</blockquote>
            <figcaption className="mt-4 text-sm">
              <span className="font-semibold text-foreground">{item.author}</span>{" "}
              <span className="text-foreground/50">— {item.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
