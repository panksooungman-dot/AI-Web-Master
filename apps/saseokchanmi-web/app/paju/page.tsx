import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { Card } from "@cnbiz/ui";
import { PageHero } from "@/components/ui/PageHero";
import { NEARBY_AREAS, TOUR_DATE_COURSE_INTRO, TOUR_SPOTS } from "@/lib/content";
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
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{TOUR_DATE_COURSE_INTRO}</p>
          <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {TOUR_SPOTS.map((spot) => (
              <Card key={spot.name} className="w-72 shrink-0 snap-start sm:w-80">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-lg font-bold text-foreground">{spot.name}</p>
                  {spot.travelTime && (
                    <span className="whitespace-nowrap rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      {spot.travelTime}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-base leading-relaxed text-muted">{spot.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
