import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { PageHero } from "@/components/ui/PageHero";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { seoKeywords } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "사색찬미 이야기",
  description: "정갈함과 정성을 우선하는 사색찬미한정식의 브랜드 철학을 소개합니다.",
  keywords: seoKeywords("brand", "core"),
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="사색찬미 이야기"
        description="한 상을 차리는 마음까지 담았습니다."
      />
      <section className="bg-background py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <PhotoPlaceholder label="매장 전경" aspect="wide" />
          <div className="space-y-4 text-base leading-relaxed text-muted">
            <p>
              사색찬미한정식은 정갈함, 따뜻함, 정성, 전통, 자연, 가족이라는 여섯 가지 가치를
              바탕으로 한 상을 준비합니다.
            </p>
            <p>
              과도한 장식보다 좋은 재료와 정직한 조리로 만든 음식 자체가 브랜드의 중심이라고
              믿습니다. 갓 지은 솥밥과 정갈한 반찬으로 채운 한 상이 좋은 사람과 나누는 따뜻한
              시간이 되기를 바랍니다.
            </p>
            <p>
              가족모임, 상견례, 생신, 단체모임 등 다양한 자리에서 편안하게 찾아주실 수 있는
              공간이 되고자 합니다.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
