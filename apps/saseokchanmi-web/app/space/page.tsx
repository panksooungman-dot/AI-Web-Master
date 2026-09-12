import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { TodoBadge } from "@/components/ui/TodoBadge";
import { PageHero } from "@/components/ui/PageHero";
import { SPACE_PHOTOS } from "@/lib/content";
import { CONTACT, seoKeywords } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "매장·주차 안내",
  description: "사색찬미한정식의 매장 공간과 주차 안내입니다.",
  keywords: seoKeywords("occasion"),
  alternates: { canonical: "/space" },
};

export default function SpacePage() {
  return (
    <>
      <PageHero
        eyebrow="Space"
        title="편안하게 머무를 수 있는 공간"
        description="방문 전 공간에 대한 불안을 줄이는 것을 목표로 합니다."
      />
      <section className="bg-background py-20">
        <Container>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SPACE_PHOTOS.map((photo) => (
              <PhotoPlaceholder key={photo.label} label={photo.label} aspect="square" />
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-dashed border-primary/30 bg-secondary/30 p-6 text-sm leading-relaxed text-muted">
            <p className="font-semibold text-foreground">주차 안내</p>
            <p className="mt-2">
              {CONTACT.parkingInfo ?? "실제 주차 가능 대수·방식은 매장 확인 후 안내해 드립니다."}
            </p>
            {!CONTACT.parkingInfo && <TodoBadge label="주차 조건 확인 필요" className="mt-3" />}
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted">
            개별룸·프라이빗 공간은 실제 존재가 확인된 경우에만 안내해 드립니다.
            <TodoBadge label="개별룸 보유 여부 확인 필요" className="ml-2 align-middle" />
          </p>
        </Container>
      </section>
    </>
  );
}
