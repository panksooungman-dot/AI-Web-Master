import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { PageHero } from "@/components/ui/PageHero";
import { CONTACT, seoKeywords } from "@/lib/site-config";
import { telUrl } from "@/lib/links";

export const metadata: Metadata = {
  title: "예약 안내",
  description: "사색찬미한정식 예약 안내. 네이버 예약 또는 전화로 예약하실 수 있습니다.",
  keywords: seoKeywords("core", "occasion"),
  alternates: { canonical: "/reservation" },
};

/**
 * 2026-09-21 — 자체 예약 문의 폼(입력→로컬 파일 저장)을 제거했다. 접수돼도 확인할 관리자
 * 화면이 없어 사장님이 놓칠 위험이 있었고, 실제 예약은 이미 네이버 예약(스마트플레이스
 * "식당형", 예약금·시간대 설정 지원)이 정식으로 처리하므로 별도 채널을 유지할 이유가
 * 없다고 판단(매장주 확인: "하루에 최소 100명 이하라서 바빠서 관리를 못해"). 전화는
 * 사장님이 이미 직접 받는 기존 채널이라 그대로 안내만 한다.
 */
export default function ReservationPage() {
  const phoneHref = telUrl();

  return (
    <>
      <PageHero eyebrow="Reservation" title="예약 안내" description="네이버 예약 또는 전화로 예약해 주세요." />
      <section className="bg-background py-20">
        <Container className="max-w-xl space-y-6">
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

          {phoneHref && (
            <div className="rounded-xl border border-secondary bg-secondary/10 p-6 text-center">
              <p className="font-semibold text-foreground">전화로 예약하기</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                단체·룸 예약 등 자세한 상담이 필요하시면 전화로 문의해 주세요.
              </p>
              <a
                href={phoneHref}
                className="mt-4 inline-flex items-center justify-center rounded-lg border border-primary px-6 py-3 text-sm font-semibold text-primary"
              >
                {CONTACT.phone}
              </a>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
