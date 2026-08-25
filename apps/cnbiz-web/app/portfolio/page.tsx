import type { Metadata } from "next";
import { PortfolioHeroSection } from "@/components/sections/PortfolioHeroSection";
import { PortfolioPlaceholderSection } from "@/components/sections/PortfolioPlaceholderSection";
import { CTASection } from "@/components/sections/CTASection";
import { OG_DEFAULTS, SITE_URL } from "@/lib/site-config";

const title = "포트폴리오";
const description =
  "CNBIZ의 프로젝트 사례를 소개하는 포트폴리오 페이지입니다. 실제 사례는 자료 확정 후 순차적으로 공개될 예정입니다.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/portfolio",
  },
  openGraph: {
    ...OG_DEFAULTS,
    title,
    description,
    url: `${SITE_URL}/portfolio`,
  },
};

export default function PortfolioPage() {
  return (
    <>
      <PortfolioHeroSection />
      <PortfolioPlaceholderSection />
      <CTASection blendFrom="white" />
    </>
  );
}
