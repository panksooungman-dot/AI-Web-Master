import type { Metadata } from "next";
import { ServicesHeroSection } from "@/components/sections/ServicesHeroSection";
import { ServicesOverviewSection } from "@/components/sections/ServicesOverviewSection";
import { ServicesDetailSection } from "@/components/sections/ServicesDetailSection";
import { ServiceProcessSection } from "@/components/sections/ServiceProcessSection";
import { CTASection } from "@/components/sections/CTASection";
import { OG_DEFAULTS, SITE_URL } from "@/lib/site-config";

const title = "사업소개";
const description =
  "CNBIZ의 디지털 전환 컨설팅, AI/ML 솔루션, 엔터프라이즈 개발, 클라우드 인프라 서비스와 도입 프로세스를 소개합니다.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    ...OG_DEFAULTS,
    title,
    description,
    url: `${SITE_URL}/services`,
  },
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
