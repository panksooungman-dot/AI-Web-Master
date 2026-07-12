import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Testimonials } from "@/components/Testimonials";
import { CTA } from "@/components/CTA";
import { Newsletter } from "@/components/Newsletter";
import { content } from "@/lib/content";

export default function Home() {
  return (
    <>
      <Hero
        kicker={content.home.kicker}
        title={content.home.headline}
        subtitle={content.home.subheadline}
        primaryCta={{ label: content.home.ctaLabel, href: "/contact" }}
        secondaryCta={{ label: "View Pricing", href: "/pricing" }}
      />
      <Features items={content.home.features} />
      <Testimonials items={content.home.testimonials} />
      <CTA title={content.home.ctaTitle} subtitle={content.home.ctaSubtitle} />
      <Newsletter title={content.home.newsletterTitle} subtitle={content.home.newsletterSubtitle} />
    </>
  );
}
