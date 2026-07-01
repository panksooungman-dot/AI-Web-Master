import type { Metadata } from "next";
import { OG_DEFAULTS } from "@/lib/site-config";
import PortfolioComingSoonSection from "@/components/sections/PortfolioComingSoonSection";

export const metadata: Metadata = {
  title: "포트폴리오",
  description: "CNBIZ의 프로젝트 사례와 성과를 담은 포트폴리오 페이지를 준비하고 있습니다.",
  alternates: {
    canonical: "/portfolio",
  },
  openGraph: {
    ...OG_DEFAULTS,
    title: "포트폴리오 | CNBIZ",
    description: "CNBIZ의 프로젝트 사례와 성과를 담은 포트폴리오 페이지를 준비하고 있습니다.",
    url: "/portfolio",
  },
};

export default function PortfolioPage() {
  return <PortfolioComingSoonSection />;
}
