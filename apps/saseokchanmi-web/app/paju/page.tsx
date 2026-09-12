import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { Card } from "@cnbiz/ui";
import { PageHero } from "@/components/ui/PageHero";
import { NEARBY_AREAS, TOUR_SPOTS } from "@/lib/content";
import { ADDRESS, seoKeywords } from "@/lib/site-config";
import { TodoBadge } from "@/components/ui/TodoBadge";

export const metadata: Metadata = {
  title: "광탄·파주 이야기",
  description: "파주 광탄에 자리한 사색찬미한정식과 주변 지역, 파주 여행 정보.",
  keywords: seoKeywords("gwangtan", "tour"),
  alternates: { canonical: "/paju" },
};

export default function PajuPage() {
  return (
    <>
      <PageHero eyebrow="Local" title="광탄, 사색찬미가 자리한 곳" description={ADDRESS.full} />

      <section className="bg-background py-20">
        <Container>
          <p className="text-base leading-relaxed text-muted">
            사색찬미한정식은 파주 광탄에 자리하고 있습니다. 운정·야당·금촌·금릉·교하·문산·조리·
            탄현 등 인근 파주 생활권에서도 편안하게 찾아오실 수 있습니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {NEARBY_AREAS.map((area) => (
              <span key={area} className="rounded-full bg-secondary/50 px-3 py-1 text-xs font-medium text-muted">
                {area}
              </span>
            ))}
          </div>
          <TodoBadge label="실제 접근성(도로·소요시간) 확인 후 문구 보강 필요" className="mt-4" />
        </Container>
      </section>

      <section className="bg-secondary/30 py-20">
        <Container>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Tour</p>
          <h2 className="mt-3 text-3xl font-bold text-foreground">파주 여행 중 만나는 맛있는 한 끼</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TOUR_SPOTS.map((spot) => (
              <Card key={spot.name}>
                <p className="text-base font-bold text-foreground">{spot.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{spot.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
