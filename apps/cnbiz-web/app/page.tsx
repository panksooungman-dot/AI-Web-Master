import { HeroSection } from "@/components/sections/HeroSection";
import { ValuesSection } from "@/components/sections/ValuesSection";
import { ServicesOverviewSection } from "@/components/sections/ServicesOverviewSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { CTASection } from "@/components/sections/CTASection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <ValuesSection />
      <ServicesOverviewSection />
      <FAQSection />
      <CTASection />
    </>
  );
}
