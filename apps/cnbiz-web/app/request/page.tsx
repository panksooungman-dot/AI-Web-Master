import type { Metadata } from "next";
import { RequestHeroSection } from "@/components/sections/RequestHeroSection";
import { RequestFormSection } from "@/components/sections/RequestFormSection";

export const metadata: Metadata = {
  title: "제작 의뢰",
  description: "CNBIZ에 홈페이지 제작을 의뢰하세요. 담당자가 영업일 기준 24시간 이내에 연락드립니다.",
};

export default function RequestPage() {
  return (
    <>
      <RequestHeroSection />
      <RequestFormSection />
    </>
  );
}
