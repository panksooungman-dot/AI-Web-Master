import type { Metadata } from "next";
import { OG_DEFAULTS } from "@/lib/site-config";
import ContactSection from "@/components/sections/ContactSection";

export const metadata: Metadata = {
  title: "문의하기",
  description:
    "CNBIZ에 프로젝트 상담이나 궁금한 점을 문의해보세요. 담당자가 영업일 기준 24시간 이내에 답변드립니다.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    ...OG_DEFAULTS,
    title: "문의하기 | CNBIZ",
    description: "CNBIZ에 프로젝트 상담이나 궁금한 점을 문의해보세요.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return <ContactSection />;
}
