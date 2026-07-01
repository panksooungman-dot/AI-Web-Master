import type { Metadata } from "next";
import { OG_DEFAULTS } from "@/lib/site-config";
import ServicesHeroSection from "@/components/sections/ServicesHeroSection";
import ServicesOverviewSection from "@/components/sections/ServicesOverviewSection";
import ServicesDetailSection from "@/components/sections/ServicesDetailSection";
import ServiceProcessSection from "@/components/sections/ServiceProcessSection";

export const metadata: Metadata = {
  title: "사업소개",
  description:
    "CNBIZ의 디지털 전환 컨설팅, AI/ML 솔루션, 엔터프라이즈 개발, 클라우드 인프라 서비스와 도입 프로세스를 소개합니다.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    ...OG_DEFAULTS,
    title: "사업소개 | CNBIZ",
    description:
      "CNBIZ의 디지털 전환 컨설팅, AI/ML 솔루션, 엔터프라이즈 개발, 클라우드 인프라 서비스와 도입 프로세스를 소개합니다.",
    url: "/services",
  },
};

export default function ServicesPage() {
  return (
    <>
      <ServicesHeroSection />
      <ServicesOverviewSection />
      <ServicesDetailSection />
      <ServiceProcessSection />
    </>
  );
}
