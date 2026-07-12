import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { content } from "@/lib/content";

export const metadata: Metadata = {
  title: content.privacy.title,
  description: content.privacy.title
};

export default function PrivacyPage() {
  return (
    <>
      <Hero title={content.privacy.title} />
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-3xl space-y-6 px-6">
          {content.privacy.body.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="text-sm leading-relaxed text-foreground/70">
              {paragraph}
            </p>
          ))}
        </div>
      </section>
    </>
  );
}
