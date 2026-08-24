import type { Metadata } from "next";
import { ContactHeroSection } from "@/components/sections/ContactHeroSection";
import { ContactProcessSection } from "@/components/sections/ContactProcessSection";
import { ContactForm } from "@/components/sections/ContactForm";
import { OG_DEFAULTS, SITE_URL } from "@/lib/site-config";

const title = "문의하기";
const description = "CNBIZ에 프로젝트를 문의하세요. 담당자가 확인 후 순차적으로 연락드립니다.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    ...OG_DEFAULTS,
    title,
    description,
    url: `${SITE_URL}/contact`,
  },
};

export default function ContactPage() {
  return (
    <>
      <ContactHeroSection />
      <ContactProcessSection />
      <ContactForm />
    </>
  );
}
