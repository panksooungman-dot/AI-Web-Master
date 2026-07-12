import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { Pricing } from "@/components/Pricing";
import { CTA } from "@/components/CTA";
import { content } from "@/lib/content";

export const metadata: Metadata = {
  title: content.pricing.title,
  description: content.pricing.intro
};

export default function PricingPage() {
  return (
    <>
      <Hero title={content.pricing.title} subtitle={content.pricing.intro} />
      <Pricing plans={content.pricing.plans} />
      <CTA title="Still have questions?" ctaLabel="Read the FAQ" ctaHref="/faq" />
    </>
  );
}
