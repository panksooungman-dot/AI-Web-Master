import type { Metadata } from "next";
import { ContactHeroSection } from "@/components/sections/ContactHeroSection";
import { ContactForm } from "@/components/sections/ContactForm";

export const metadata: Metadata = {
  title: "문의하기",
  description: "CNBIZ에 프로젝트를 문의하세요. 담당자가 확인 후 순차적으로 연락드립니다.",
};

export default function ContactPage() {
  return (
    <>
      <ContactHeroSection />
      <ContactForm />
    </>
  );
}
