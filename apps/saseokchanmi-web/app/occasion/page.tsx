import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { Card, LinkButton } from "@cnbiz/ui";
import { PageHero } from "@/components/ui/PageHero";
import { OCCASIONS } from "@/lib/content";
import { RESERVATION_HREF, seoKeywords } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "모임 안내",
  description: "가족모임·부모님 식사·생신·상견례·단체식사에 맞는 사색찬미한정식 안내.",
  keywords: seoKeywords("occasion"),
  alternates: { canonical: "/occasion" },
};

export default function OccasionPage() {
  return (
    <>
      <PageHero eyebrow="Occasion" title="이런 자리에 사색찬미를 추천합니다" />
      <section className="bg-background py-20">
        <Container className="space-y-6">
          {OCCASIONS.map((occasion) => (
            <Card key={occasion.slug} id={occasion.slug} className="scroll-mt-24">
              <p className="text-xl font-bold text-foreground">{occasion.title}</p>
              <p className="mt-2 text-base leading-relaxed text-muted">{occasion.description}</p>
              <LinkButton href={RESERVATION_HREF} variant="secondary" className="mt-4">
                이 모임으로 예약 문의
              </LinkButton>
            </Card>
          ))}
        </Container>
      </section>
    </>
  );
}
