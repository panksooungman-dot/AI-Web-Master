import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { PageHero } from "@/components/ui/PageHero";
import { ReservationForm } from "@/components/sections/ReservationForm";
import { CONTACT, seoKeywords } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "예약 문의",
  description: "사색찬미한정식 예약 문의. 이름, 연락처, 방문 희망일과 인원을 남겨주세요.",
  keywords: seoKeywords("core", "occasion"),
  alternates: { canonical: "/reservation" },
};

export default function ReservationPage() {
  return (
    <>
      <PageHero eyebrow="Reservation" title="예약 문의" description="원하시는 방법으로 예약해 주세요." />
      <section className="bg-background py-20">
        <Container className="max-w-xl space-y-10">
          {CONTACT.naverPlaceUrl && (
            <div className="rounded-xl border border-primary/30 bg-secondary/30 p-6 text-center">
              <p className="font-semibold text-foreground">네이버 예약으로 바로 예약하기</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                원하시는 날짜와 시간을 바로 선택해 실시간으로 예약할 수 있습니다.
              </p>
              <a
                href={CONTACT.naverPlaceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white"
              >
                네이버 예약하기
              </a>
            </div>
          )}

          <div>
            <p className="mb-5 text-center text-sm font-semibold text-foreground">
              간단한 문의만 남기고 싶다면 아래에 남겨주세요.
            </p>
            <ReservationForm />
          </div>
        </Container>
      </section>
    </>
  );
}
