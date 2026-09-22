import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";
import { PageHero } from "@/components/ui/PageHero";
import { TodoBadge } from "@/components/ui/TodoBadge";
import { ADDITIONAL_MENU, SIGNATURE_MENU, type MenuItem } from "@/lib/content";
import { OG_DEFAULTS, OG_IMAGE, RESERVATION_HREF, seoKeywords } from "@/lib/site-config";

const TITLE = "한정식 메뉴";
const DESCRIPTION = "사색찬미한정식의 대표 한정식 코스를 소개합니다.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: seoKeywords("core", "menu"),
  alternates: { canonical: "/menu" },
  openGraph: { ...OG_DEFAULTS, title: TITLE, description: DESCRIPTION, url: "/menu", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [OG_IMAGE.url] },
};

/**
 * 메뉴판 형식 — 네이버플레이스 메뉴 탭처럼 작은 썸네일 + 이름·설명·가격을 한 줄씩 나열한다.
 * 썸네일 원본이 70x70px 안팎으로 작아, 카드처럼 크게 띄우는 대신 이 h-16 w-16(64px)
 * 크기로만 보여줘 확대로 인한 흐림이 생기지 않는다.
 */
function MenuRow({ item, index, fallbackLabel }: { item: MenuItem; index: number; fallbackLabel: string }) {
  const label = item.name ?? `${fallbackLabel} ${index + 1}`;
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {item.image && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary/40">
          <Image src={item.image} alt={label} fill sizes="64px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {item.name ? (
          <>
            <p className="font-semibold text-foreground">{item.name}</p>
            {item.price && <p className="mt-0.5 text-sm font-semibold text-primary">{item.price}</p>}
          </>
        ) : (
          <TodoBadge label={item.todo ?? "확인 필요"} />
        )}
        {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
      </div>
    </div>
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
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-foreground">대표 메뉴</h2>
            <div className="mt-6 divide-y divide-secondary overflow-hidden rounded-xl border border-secondary">
              {SIGNATURE_MENU.map((item, index) => (
                <MenuRow key={index} item={item} index={index} fallbackLabel="대표 메뉴" />
              ))}
            </div>

            <h2 className="mt-16 text-2xl font-bold text-foreground">그 외 메뉴</h2>
            <div className="mt-6 divide-y divide-secondary overflow-hidden rounded-xl border border-secondary">
              {ADDITIONAL_MENU.map((item, index) => (
                <MenuRow key={index} item={item} index={index} fallbackLabel="메뉴" />
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
          </div>

          <div className="mt-8 text-center">
            <LinkButton href={RESERVATION_HREF}>예약 문의하기</LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
