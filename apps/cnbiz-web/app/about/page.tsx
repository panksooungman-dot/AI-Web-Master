import type { Metadata } from "next";
import { AboutHeroSection } from "@/components/sections/AboutHeroSection";
import { CompanyOverviewSection } from "@/components/sections/CompanyOverviewSection";
import { MissionVisionSection } from "@/components/sections/MissionVisionSection";
import { AboutProcessSection } from "@/components/sections/AboutProcessSection";
import { CTASection } from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "회사소개",
  description:
    "CNBIZ는 기업의 디지털 전환을 이끄는 IT 전문 기업입니다. 회사 개요, Mission·Vision, 핵심 가치, 일하는 방식을 소개합니다.",
};

export default function AboutPage() {
  return (
    <>
      <AboutHeroSection />
      <CompanyOverviewSection />
      <MissionVisionSection />
      <AboutProcessSection />
      <CTASection />
    </>
  );
}
