import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@cnbiz/layout-primitives";
import { Card, LinkButton } from "@cnbiz/ui";
import { PageHero } from "@/components/ui/PageHero";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { TodoBadge } from "@/components/ui/TodoBadge";
import { ADDITIONAL_MENU, SIGNATURE_MENU, type MenuItem } from "@/lib/content";
import { RESERVATION_HREF, seoKeywords } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "한정식 메뉴",
  description: "사색찬미한정식의 대표 한정식 코스를 소개합니다.",
  keywords: seoKeywords("core", "menu"),
  alternates: { canonical: "/menu" },
};

function MenuCard({ item, index, fallbackLabel }: { item: MenuItem; index: number; fallbackLabel: string }) {
  const label = item.name ?? `${fallbackLabel} ${index + 1}`;
  return (
    <Card className="flex flex-col gap-3">
      {item.image ? (
        <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary/40">
          <Image src={item.image} alt={label} fill sizes="(min-width: 640px) 25vw, 100vw" className="object-cover" />
        </div>
      ) : (
        <PhotoPlaceholder label={label} aspect="square" />
      )}
      {item.name ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold text-foreground">{item.name}</p>
            {item.price && <p className="whitespace-nowrap text-sm font-semibold text-primary">{item.price}</p>}
          </div>
          {item.description && <p className="text-sm text-muted">{item.description}</p>}
        </div>
      ) : (
        <TodoBadge label={item.todo ?? "확인 필요"} />
      )}
    </Card>
  );
}

export default function MenuPage() {
  return (
    <>
      <PageHero
        eyebrow="Menu"
        title="사색찬미의 대표 한정식"
        description="정성껏 준비한 대표 한정식 코스를 소개합니다."
      />
      <section className="bg-background py-20">
        <Container>
          <div className="grid gap-6 sm:grid-cols-4">
            {SIGNATURE_MENU.map((item, index) => (
              <MenuCard key={index} item={item} index={index} fallbackLabel="대표 메뉴" />
            ))}
          </div>

          <h2 className="mt-16 text-2xl font-bold text-foreground">그 외 메뉴</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-4">
            {ADDITIONAL_MENU.map((item, index) => (
              <MenuCard key={index} item={item} index={index} fallbackLabel="메뉴" />
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
