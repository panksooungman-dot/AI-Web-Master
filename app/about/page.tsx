import type { Metadata } from "next";
import { OG_DEFAULTS } from "@/lib/site-config";
import AboutHeroSection from "@/components/sections/AboutHeroSection";
import VisionMissionSection from "@/components/sections/VisionMissionSection";
import HistorySection from "@/components/sections/HistorySection";
import TeamSection from "@/components/sections/TeamSection";

export const metadata: Metadata = {
  title: "회사소개",
  description:
    "CNBIZ의 비전과 미션, 핵심 가치, 성장 여정과 조직을 소개합니다. 2010년 설립 이래 고객과 함께 성장해온 디지털 혁신 파트너입니다.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    ...OG_DEFAULTS,
    title: "회사소개 | CNBIZ",
    description: "CNBIZ의 비전과 미션, 핵심 가치, 성장 여정과 조직을 소개합니다.",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <AboutHeroSection />
      <VisionMissionSection />
      <HistorySection />
      <TeamSection />
    </>
  );
}
