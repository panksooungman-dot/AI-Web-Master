import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { TodoBadge } from "@/components/ui/TodoBadge";
import { PageHero } from "@/components/ui/PageHero";
import { seoKeywords } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "음식·솥밥 이야기",
  description: "사색찬미한정식이 한 상에 담는 솥밥과 음식 이야기.",
  keywords: seoKeywords("menu", "core"),
  alternates: { canonical: "/food" },
};

export default function FoodPage() {
  return (
    <>
      <PageHero eyebrow="Food" title="이것이 사색찬미의 한 상입니다" />

      <section className="bg-background py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <PhotoPlaceholder label="한 상 전체" aspect="wide" />
          <div className="space-y-4 text-base leading-relaxed text-muted">
            <p>
              솥밥, 생선, 고기, 정갈한 반찬까지 — 한 상 위에 담긴 구성 하나하나에 사색찬미의
              정성을 담습니다.
            </p>
            <p>실제 상차림 구성과 계절 메뉴는 방문 시기에 따라 달라질 수 있습니다.</p>
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
          <PhotoPlaceholder label="갓 지은 솥밥" aspect="wide" className="order-1 lg:order-2" />
        </Container>
      </section>
    </>
  );
}
