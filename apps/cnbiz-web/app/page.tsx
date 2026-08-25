import { HeroSection } from "@/components/sections/HeroSection";
import { ApproachMapSection } from "@/components/sections/ApproachMapSection";
import { ValuesSection } from "@/components/sections/ValuesSection";
import { BrandStatementSection } from "@/components/sections/BrandStatementSection";
import { ServicesOverviewSection } from "@/components/sections/ServicesOverviewSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { CTASection } from "@/components/sections/CTASection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <ApproachMapSection />
      <ValuesSection />
      <BrandStatementSection />
      <ServicesOverviewSection />
      <FAQSection />
      <CTASection />
    </>
  );
}
