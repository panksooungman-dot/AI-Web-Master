import Link from "next/link";
import { Container } from "@cnbiz/layout-primitives";
import { Card, LinkButton } from "@cnbiz/ui";
import { NEARBY_AREAS, OCCASIONS, SIGNATURE_MENU, TOUR_SPOTS } from "@/lib/content";
import { ADDRESS, RESERVATION_HREF, SITE_TAGLINE } from "@/lib/site-config";
import { naverMapUrl } from "@/lib/links";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { TodoBadge } from "@/components/ui/TodoBadge";

const LABEL = "text-sm font-semibold tracking-widest uppercase text-primary";
const H2 = "text-3xl font-bold leading-tight text-foreground sm:text-4xl";
const BODY = "text-base leading-relaxed text-muted";

/** 01 HERO */
export function HeroSection() {
  return (
    <section className="bg-secondary/40 py-20 sm:py-28">
      <Container className="flex flex-col items-center gap-6 text-center">
        <span className={LABEL}>파주 광탄 · 한정식</span>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {SITE_TAGLINE}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted">
          갓 지은 솥밥과 정갈한 한 상, 좋은 사람과 함께하는 따뜻한 식사
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/menu">메뉴 보기</LinkButton>
          <LinkButton href={RESERVATION_HREF} variant="secondary">
            예약 문의
          </LinkButton>
        </div>
        <p className="text-sm text-muted">{ADDRESS.region} · 한정식 · 솥밥</p>
      </Container>
    </section>
  );
}

/** 02 BRAND */
export function BrandSection() {
  return (
    <section className="bg-background py-20 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <PhotoPlaceholder label="브랜드" aspect="wide" />
        <div>
          <span className={LABEL}>Brand</span>
          <h2 className={`${H2} mt-3`}>한 상을 차리는 마음까지 담았습니다</h2>
          <p className={`${BODY} mt-4`}>
            사색찬미한정식은 정갈함과 정성을 우선으로 한 상을 준비합니다. 좋은 재료로 갓 지은
            솥밥과 함께, 좋은 사람과 나누는 따뜻한 한 끼가 되도록 매 상을 정성껏 차립니다.
          </p>
        </div>
      </Container>
    </section>
  );
}

/** 03 SIGNATURE — 대표 메뉴 */
export function SignatureMenuSection() {
  return (
    <section className="bg-secondary/30 py-20 sm:py-24">
      <Container>
        <div className="text-center">
          <span className={LABEL}>Signature</span>
          <h2 className={`${H2} mt-3`}>사색찬미의 대표 한정식</h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {SIGNATURE_MENU.map((item, index) => (
            <Card key={index} className="flex flex-col gap-3">
              <PhotoPlaceholder label={`대표 메뉴 ${index + 1}`} aspect="square" />
              <TodoBadge label={item.todo} />
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
          <LinkButton href="/menu" variant="secondary">
            메뉴 상세 보기
          </LinkButton>
        </div>
      </Container>
    </section>
  );
}

/** 04 FOOD — 한 상 */
export function FoodSection() {
  return (
    <section className="bg-background py-20 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="order-2 lg:order-1">
          <span className={LABEL}>Food</span>
          <h2 className={`${H2} mt-3`}>이것이 사색찬미의 한 상입니다</h2>
          <p className={`${BODY} mt-4`}>
            솥밥, 생선, 고기, 정갈한 반찬까지 — 한 상 위에 담긴 구성 하나하나가 사색찬미의
            정성을 보여줍니다.
          </p>
          <LinkButton href="/food" variant="secondary" className="mt-6">
            음식 이야기 보기
          </LinkButton>
        </div>
        <PhotoPlaceholder label="사색찬미의 한 상" aspect="wide" className="order-1 lg:order-2" />
      </Container>
    </section>
  );
}

/** 05 SOUL — 솥밥 */
export function SoulSection() {
  return (
    <section className="bg-secondary/30 py-20 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <PhotoPlaceholder label="갓 지은 솥밥" aspect="wide" />
        <div>
          <span className={LABEL}>Soul · 솥밥</span>
          <h2 className={`${H2} mt-3`}>갓 지은 솥밥, 사색찬미의 자부심</h2>
          <p className={`${BODY} mt-4`}>
            사색찬미한정식은 갓 지은 솥밥을 상의 중심에 둡니다. 따뜻하게 지어낸 밥 한 그릇이
            한 상의 완성도를 더합니다.
          </p>
          <TodoBadge label="누룽지 등 실제 제공 방식 확인 필요" className="mt-3" />
        </div>
      </Container>
    </section>
  );
}

/** 06 SPACE — 매장·주차 (요약) */
export function SpaceTeaserSection() {
  return (
    <section className="bg-background py-20 sm:py-24">
      <Container>
        <div className="text-center">
          <span className={LABEL}>Space</span>
          <h2 className={`${H2} mt-3`}>편안하게 머무를 수 있는 공간</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <PhotoPlaceholder label="외관" aspect="square" />
          <PhotoPlaceholder label="홀·좌석" aspect="square" />
          <PhotoPlaceholder label="주차 공간" aspect="square" />
        </div>
        <div className="mt-8 text-center">
          <LinkButton href="/space" variant="secondary">
            매장·주차 자세히 보기
          </LinkButton>
        </div>
      </Container>
    </section>
  );
}

/** 07 OCCASION — 목적별 방문 */
export function OccasionTeaserSection() {
  return (
    <section className="bg-secondary/30 py-20 sm:py-24">
      <Container>
        <div className="text-center">
          <span className={LABEL}>Occasion</span>
          <h2 className={`${H2} mt-3`}>이런 자리에 사색찬미를 추천합니다</h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {OCCASIONS.map((occasion) => (
            <Link key={occasion.slug} href={`/occasion#${occasion.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <p className="text-base font-bold text-foreground">{occasion.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{occasion.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

/** 08 LOCAL — 광탄·파주 (요약) */
export function LocalSection() {
  return (
    <section className="bg-background py-20 sm:py-24">
      <Container>
        <span className={LABEL}>Local</span>
        <h2 className={`${H2} mt-3`}>광탄, 사색찬미가 자리한 곳</h2>
        <p className={`${BODY} mt-4 max-w-2xl`}>
          사색찬미한정식은 파주 광탄에 자리하고 있습니다. {ADDRESS.full}, 인근 파주 생활권에서도
          편안하게 찾아오실 수 있습니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {NEARBY_AREAS.map((area) => (
            <span key={area} className="rounded-full bg-secondary/50 px-3 py-1 text-xs font-medium text-muted">
              {area}
            </span>
          ))}
        </div>
        <LinkButton href="/paju" variant="secondary" className="mt-6">
          광탄·파주 이야기 보기
        </LinkButton>
      </Container>
    </section>
  );
}

/** 09 TOUR — 파주 여행 */
export function TourSection() {
  return (
    <section className="bg-secondary/30 py-20 sm:py-24">
      <Container>
        <span className={LABEL}>Tour</span>
        <h2 className={`${H2} mt-3`}>파주 여행 중 만나는 맛있는 한 끼</h2>
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
  );
}

/** 10 REVIEW — 고객 후기 (요약) */
export function ReviewTeaserSection() {
  return (
    <section className="bg-background py-20 sm:py-24">
      <Container className="text-center">
        <span className={LABEL}>Review</span>
        <h2 className={`${H2} mt-3`}>고객의 이야기</h2>
        <p className={`${BODY} mx-auto mt-4 max-w-xl`}>
          실제 방문객의 후기는 준비 중입니다. 최신 후기는 네이버 플레이스에서 확인하실 수
          있습니다.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LinkButton href="/review" variant="secondary">
            후기 페이지 보기
          </LinkButton>
          <a
            href={naverMapUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-sm font-semibold text-primary hover:underline"
          >
            네이버 플레이스에서 보기 →
          </a>
        </div>
      </Container>
    </section>
  );
}

/** 11 LOCATION — 오시는 길 (요약) */
export function LocationTeaserSection() {
  return (
    <section className="bg-secondary/30 py-20 sm:py-24">
      <Container className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <PhotoPlaceholder label="지도" aspect="wide" />
        <div>
          <span className={LABEL}>Location</span>
          <h2 className={`${H2} mt-3`}>오시는 길</h2>
          <p className={`${BODY} mt-4`}>{ADDRESS.full}</p>
          <LinkButton href="/location" variant="secondary" className="mt-6">
            길찾기·주차 정보 보기
          </LinkButton>
        </div>
      </Container>
    </section>
  );
}

/** 12 FINAL CTA */
export function FinalCTASection() {
  return (
    <section className="bg-primary py-20 text-white sm:py-24">
      <Container className="flex flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          오늘, 좋은 사람과 함께 따뜻한 한 끼 어떠세요?
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <LinkButton href={RESERVATION_HREF} variant="secondary">
            예약 문의
          </LinkButton>
          <a
            href={naverMapUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-white/60 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            길찾기
          </a>
        </div>
      </Container>
    </section>
  );
}
