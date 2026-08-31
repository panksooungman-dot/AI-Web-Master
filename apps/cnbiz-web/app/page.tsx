import { HeroSection } from "@/components/sections/HeroSection";
import { ApproachMapSection } from "@/components/sections/ApproachMapSection";
import { ValuesSection } from "@/components/sections/ValuesSection";
import { BrandStatementSection } from "@/components/sections/BrandStatementSection";
import { ServicesOverviewSection } from "@/components/sections/ServicesOverviewSection";
import { ShowcaseSection } from "@/components/sections/ShowcaseSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { PortfolioTypesSection } from "@/components/sections/PortfolioTypesSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { CTASection } from "@/components/sections/CTASection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <ApproachMapSection />
      <ValuesSection />
      <BrandStatementSection />
      <ServicesOverviewSection blendFrom="white" />
      <FAQSection />
      <ShowcaseSection />
      <PricingSection blendFrom="alt" />
      <PortfolioTypesSection blendFrom="white" />
      <CTASection blendFrom="alt" />
    </>
  );
}
