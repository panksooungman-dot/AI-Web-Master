import type { Metadata } from "next";
import { ServicesHeroSection } from "@/components/sections/ServicesHeroSection";
import { ServicesOverviewSection } from "@/components/sections/ServicesOverviewSection";
import { ServicesDetailSection } from "@/components/sections/ServicesDetailSection";
import { ServiceProcessSection } from "@/components/sections/ServiceProcessSection";
import { CTASection } from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "사업소개",
  description:
    "CNBIZ의 디지털 전환 컨설팅, AI/ML 솔루션, 엔터프라이즈 개발, 클라우드 인프라 서비스와 도입 프로세스를 소개합니다.",
};

export default function ServicesPage() {
  return (
    <>
      <ServicesHeroSection />
      <ServicesOverviewSection />
      <ServicesDetailSection />
      <ServiceProcessSection />
      <CTASection />
    </>
  );
}
