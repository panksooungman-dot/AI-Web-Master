import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@cnbiz/layout-primitives";
import { TodoBadge } from "@/components/ui/TodoBadge";
import { PageHero } from "@/components/ui/PageHero";
import { seoKeywords } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "음식·솥밥 이야기",
  description: "사색찬미한정식이 한 상에 담는 솥밥과 음식 이야기.",
  keywords: seoKeywords("menu", "core"),
  alternates: { canonical: "/food" },
};

function StoryPhoto({ src, alt, reverse = false }: { src: string; alt: string; reverse?: boolean }) {
  return (
    <div
      className={`relative aspect-[16/10] overflow-hidden rounded-xl bg-secondary/40 ${
        reverse ? "order-1 lg:order-2" : ""
      }`}
    >
      <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
    </div>
  );
}

export default function FoodPage() {
  return (
    <>
      <PageHero eyebrow="Food" title="이것이 사색찬미의 한 상입니다" />

      <section className="bg-background py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <StoryPhoto src="/images/food/plating.jpg" alt="정성을 다해 한 상을 완성하는 손길" />
          <div className="space-y-4 text-base leading-relaxed text-muted">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Care</p>
            <p className="text-2xl font-bold text-foreground">마지막 순간까지, 손끝으로 완성합니다</p>
            <p>양념 하나, 고명 하나를 올리는 순간까지 사색찬미는 정성을 다합니다.</p>
          </div>
        </Container>
      </section>

      <section className="bg-secondary/30 py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="order-2 space-y-4 text-base leading-relaxed text-muted lg:order-1">
            <p>
              솥밥, 생선, 고기, 정갈한 반찬까지 — 한 상 위에 담긴 구성 하나하나에 사색찬미의
              정성을 담습니다.
            </p>
            <p>실제 상차림 구성과 계절 메뉴는 방문 시기에 따라 달라질 수 있습니다.</p>
          </div>
          <StoryPhoto src="/images/food/table-spread.jpg" alt="사색찬미의 한 상 전체" reverse />
        </Container>
      </section>

      <section className="bg-background py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <StoryPhoto src="/images/food/stirfry.jpg" alt="매콤하게 볶아낸 정성 가득한 반찬" />
          <div className="space-y-4 text-base leading-relaxed text-muted">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Taste</p>
            <p className="text-2xl font-bold text-foreground">곁들이는 반찬 하나에도 정성을 더합니다</p>
            <p>매콤달콤하게 볶아낸 반찬 한 접시도 정갈한 한 상의 완성도를 더합니다.</p>
          </div>
        </Container>
      </section>

      <section className="bg-secondary/30 py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="order-2 space-y-4 text-base leading-relaxed text-muted lg:order-1">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Soul · 솥밥</p>
            <p className="text-2xl font-bold text-foreground">갓 지은 솥밥, 사색찬미의 자부심</p>
            <p>
              사색찬미한정식은 갓 지은 솥밥을 상의 중심에 둡니다. 따뜻하게 지어낸 밥 한 그릇이
              한 상의 완성도를 더합니다.
            </p>
            <TodoBadge label="누룽지 등 실제 제공 방식 확인 필요" />
          </div>
          <StoryPhoto src="/images/food/sotbap-open.jpg" alt="갓 지은 솥밥의 뚜껑을 여는 순간" reverse />
        </Container>
      </section>

      <section className="bg-background py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <StoryPhoto src="/images/food/topping.jpg" alt="정성으로 마무리하는 밥 한 그릇" />
          <div className="space-y-4 text-base leading-relaxed text-muted">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Finish</p>
            <p className="text-2xl font-bold text-foreground">밥 위에 올리는 정성 한 스푼</p>
            <p>정갈한 반찬을 밥 위에 얹는 작은 손길까지, 사색찬미의 한 상은 그렇게 완성됩니다.</p>
          </div>
        </Container>
      </section>
    </>
  );
}
