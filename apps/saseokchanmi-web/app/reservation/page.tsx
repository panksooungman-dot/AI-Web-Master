import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { PageHero } from "@/components/ui/PageHero";
import { ReservationForm } from "@/components/sections/ReservationForm";
import { seoKeywords } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "예약 문의",
  description: "사색찬미한정식 예약 문의. 이름, 연락처, 방문 희망일과 인원을 남겨주세요.",
  keywords: seoKeywords("core", "occasion"),
  alternates: { canonical: "/reservation" },
};

export default function ReservationPage() {
  return (
    <>
      <PageHero eyebrow="Reservation" title="예약 문의" description="아래 정보를 남겨주시면 순차적으로 안내해 드립니다." />
      <section className="bg-background py-20">
        <Container className="max-w-xl">
          <ReservationForm />
        </Container>
      </section>
    </>
  );
}
