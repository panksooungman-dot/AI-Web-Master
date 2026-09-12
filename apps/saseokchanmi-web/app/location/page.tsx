import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";
import { PageHero } from "@/components/ui/PageHero";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { TodoBadge } from "@/components/ui/TodoBadge";
import { ADDRESS, CONTACT, RESERVATION_HREF, seoKeywords } from "@/lib/site-config";
import { naverMapUrl, telUrl } from "@/lib/links";

export const metadata: Metadata = {
  title: "오시는 길",
  description: "사색찬미한정식 오시는 길, 주소와 연락처 안내.",
  keywords: seoKeywords("core"),
  alternates: { canonical: "/location" },
};

function InfoRow({ label, value, todo }: { label: string; value: string | null; todo?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-secondary py-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {value ? <span className="text-sm text-muted">{value}</span> : <TodoBadge label={todo ?? "확인 필요"} />}
    </div>
  );
}

export default function LocationPage() {
  const phoneHref = telUrl();

  return (
    <>
      <PageHero eyebrow="Location" title="오시는 길" description={ADDRESS.full} />
      <section className="bg-background py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <PhotoPlaceholder label="지도" aspect="wide" />

          <div>
            <InfoRow label="주소" value={ADDRESS.full} />
            <InfoRow label="전화" value={CONTACT.phone} todo="전화번호 확인 필요" />
            <InfoRow label="영업시간" value={CONTACT.businessHours} todo="영업시간 확인 필요" />
            <InfoRow label="라스트오더" value={CONTACT.lastOrder} todo="라스트오더 확인 필요" />
            <InfoRow label="휴무일" value={CONTACT.closedDays} todo="휴무일 확인 필요" />
            <InfoRow label="주차" value={CONTACT.parkingInfo} todo="주차 조건 확인 필요" />

            <div className="mt-6 flex flex-wrap gap-3">
              {phoneHref && (
                <a
                  href={phoneHref}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white"
                >
                  전화 걸기
                </a>
              )}
              <a
                href={naverMapUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-secondary px-6 py-3 text-sm font-semibold text-primary"
              >
                길찾기 (네이버 지도)
              </a>
              <LinkButton href={RESERVATION_HREF} variant="secondary">
                예약 문의
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
