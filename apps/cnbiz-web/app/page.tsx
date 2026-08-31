import { HeroSection } from "@/components/sections/HeroSection";
import { ApproachMapSection } from "@/components/sections/ApproachMapSection";
import { ValuesSection } from "@/components/sections/ValuesSection";
import { BrandStatementSection } from "@/components/sections/BrandStatementSection";
import { ServicesOverviewSection } from "@/components/sections/ServicesOverviewSection";
import { ShowcaseSection } from "@/components/sections/ShowcaseSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { CTASection } from "@/components/sections/CTASection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <PricingSection blendFrom="dark" />
      <ApproachMapSection blendFrom="alt" />
      <ValuesSection />
      <BrandStatementSection />
      <ServicesOverviewSection blendFrom="white" />
      <FAQSection />
      <ShowcaseSection />
      <CTASection blendFrom="alt" />
    </>
  );
}
