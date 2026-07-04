import type { Metadata } from "next";
import { ContactHeroSection } from "@/components/sections/ContactHeroSection";
import { ContactFormSection } from "@/components/sections/ContactFormSection";
import { ContactInfoSection } from "@/components/sections/ContactInfoSection";

export const metadata: Metadata = {
  title: "문의하기",
  description: "CNBIZ에 프로젝트를 문의하세요. 담당자가 영업일 기준 24시간 이내에 연락드립니다.",
};

export default function ContactPage() {
  return (
    <>
      <ContactHeroSection />
      <ContactFormSection />
      <ContactInfoSection />
    </>
  );
}
