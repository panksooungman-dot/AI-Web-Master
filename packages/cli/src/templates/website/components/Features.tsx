import type { FeatureItem } from "@/lib/content";

export function Features({ items }: { items: FeatureItem[] }) {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg aria-hidden className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L9 11.6l6.3-6.3a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-bold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
