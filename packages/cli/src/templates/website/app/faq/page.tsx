import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { content } from "@/lib/content";

export const metadata: Metadata = {
  title: content.faq.title,
  description: content.faq.intro
};

export default function FaqPage() {
  return (
    <>
      <Hero title={content.faq.title} subtitle={content.faq.intro} />
      <FAQ items={content.faq.items} />
      <CTA title="Didn't find your answer?" ctaLabel="Contact Us" />
    </>
  );
}
