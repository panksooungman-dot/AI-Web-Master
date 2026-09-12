import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { Card, LinkButton } from "@cnbiz/ui";
import { PageHero } from "@/components/ui/PageHero";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { TodoBadge } from "@/components/ui/TodoBadge";
import { SIGNATURE_MENU } from "@/lib/content";
import { RESERVATION_HREF, seoKeywords } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "한정식 메뉴",
  description: "사색찬미한정식의 대표 한정식 코스를 소개합니다.",
  keywords: seoKeywords("core", "menu"),
  alternates: { canonical: "/menu" },
};

export default function MenuPage() {
  return (
    <>
      <PageHero
        eyebrow="Menu"
        title="사색찬미의 대표 한정식"
        description="메뉴명·가격·구성은 매장 확인 후 등록됩니다."
      />
      <section className="bg-background py-20">
        <Container>
          <div className="grid gap-6 sm:grid-cols-3">
            {SIGNATURE_MENU.map((item, index) => (
              <Card key={index} className="flex flex-col gap-3">
                <PhotoPlaceholder label={`대표 메뉴 ${index + 1}`} aspect="square" />
                <TodoBadge label={item.todo} />
              </Card>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-dashed border-primary/30 bg-secondary/30 p-6 text-sm leading-relaxed text-muted">
            <p className="font-semibold text-foreground">안내</p>
            <p className="mt-2">
              보리굴비·간장게장·떡갈비·갈비찜·한우 등은 실제 판매 메뉴로 확인된 경우에만
              표기합니다. 정확한 코스 구성과 가격은 전화 문의 또는 예약 문의를 통해 안내해
              드립니다.
            </p>
          </div>

          <div className="mt-8 text-center">
            <LinkButton href={RESERVATION_HREF}>예약 문의하기</LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
