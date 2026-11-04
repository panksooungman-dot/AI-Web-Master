import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";
import { MenuTabs } from "@/components/ui/MenuTabs";
import { PageHero } from "@/components/ui/PageHero";
import { ADDITIONAL_MENU, SIGNATURE_MENU } from "@/lib/content";
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

export default function MenuPage() {
  return (
    <>
      <PageHero
        eyebrow="Menu"
        title="사색찬미의 대표 한정식"
        description="정갈한 한상, 건강한 맛. 모든 솥밥정식은 1인 가격이며, 2인 이상 주문하실 수 있습니다."
      />
      <section className="bg-background py-20">
        <Container>
          <div className="mx-auto max-w-3xl">
            <MenuTabs signatureMenu={SIGNATURE_MENU} additionalMenu={ADDITIONAL_MENU} />

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
