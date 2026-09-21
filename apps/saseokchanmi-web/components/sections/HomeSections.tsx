import Link from "next/link";
import Image from "next/image";
import { Container } from "@cnbiz/layout-primitives";
import { Card, LinkButton } from "@cnbiz/ui";
import { NEARBY_AREAS, OCCASIONS, SIGNATURE_MENU, TOUR_DATE_COURSE_INTRO, TOUR_SPOTS } from "@/lib/content";
import { ADDRESS, CONTACT, RESERVATION_HREF, SITE_TAGLINE } from "@/lib/site-config";
import { naverMapUrl } from "@/lib/links";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { TodoBadge } from "@/components/ui/TodoBadge";
import { TraditionalPattern } from "@/components/ui/TraditionalPattern";

const LABEL = "text-sm font-semibold tracking-widest uppercase text-primary";
const H2 = "text-3xl font-bold leading-tight text-foreground sm:text-4xl";
const BODY = "text-base leading-relaxed text-muted";

/** 01 HERO — 사진 대신 전통 문양으로 깔끔하고 심플하게 한정식 분위기를 전달 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-secondary/40 py-24 sm:py-32">
      <TraditionalPattern className="opacity-[0.16]" />
      <Container className="relative flex flex-col items-center gap-6 text-center">
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

/** 02~05 통합 — 브랜드 소개부터 대표 메뉴 사진 스토리, 실제 메뉴 목록까지 하나의 흐름으로 구성.
 * 사진 5장(plating/stirfry/sotbap-open/table-spread/topping)은 이 섹션에서만 쓰고
 * 아래 다른 섹션에서는 재사용하지 않아 한 페이지 안에서 같은 사진이 중복되지 않는다. */
function StoryBlock({
  src,
  alt,
  eyebrow,
  title,
  body,
  reverse = false,
  badge,
  linkHref,
  linkLabel,
}: {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  body: string;
  reverse?: boolean;
  badge?: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
      <div
        className={`relative aspect-[16/10] overflow-hidden rounded-xl bg-secondary/40 ${
          reverse ? "order-1 lg:order-2" : ""
        }`}
      >
        <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
      </div>
      <div className={reverse ? "order-2 lg:order-1" : undefined}>
        <span className={LABEL}>{eyebrow}</span>
        <h3 className="mt-3 text-2xl font-bold leading-tight text-foreground sm:text-3xl">{title}</h3>
        <p className={`${BODY} mt-3`}>{body}</p>
        {badge && <TodoBadge label={badge} className="mt-3" />}
        {linkHref && linkLabel && (
          <LinkButton href={linkHref} variant="secondary" className="mt-4">
            {linkLabel}
          </LinkButton>
        )}
      </div>
    </div>
  );
}

export function SignatureStorySection() {
  return (
    <section className="bg-background py-20 sm:py-24">
      <Container className="flex flex-col gap-16">
        <div className="text-center">
          <span className={LABEL}>Signature</span>
          <h2 className={`${H2} mt-3`}>사색찬미의 대표 한정식</h2>
          <p className={`${BODY} mx-auto mt-4 max-w-2xl`}>
            사색찬미한정식은 정갈함과 정성을 우선으로 한 상을 준비합니다. 좋은 사람과 나누는
            따뜻한 한 끼가 되도록, 재료를 매만지는 손끝부터 갓 지은 솥밥까지 정성껏 차립니다.
          </p>
        </div>

        <StoryBlock
          src="/images/food/plating.jpg"
          alt="정성을 다해 한 상을 완성하는 손길"
          eyebrow="Care"
          title="손끝으로 완성하는 정성"
          body="생선 한 마리, 반찬 하나까지 마지막 순간까지 정갈하게 매만져 상에 올립니다."
        />
        <StoryBlock
          reverse
          src="/images/food/stirfry.jpg"
          alt="매콤하게 조려낸 코다리·제육 요리"
          eyebrow="Taste"
          title="깊은 손맛이 밴 조림·볶음"
          body="LA갈비, 제육, 코다리조림처럼 매콤달콤하게 조려낸 요리가 대표 메뉴의 중심입니다."
        />
        <StoryBlock
          src="/images/food/sotbap-open.jpg"
          alt="갓 지은 솥밥의 뚜껑을 여는 순간"
          eyebrow="Soul · 솥밥"
          title="갓 지은 솥밥, 사색찬미의 자부심"
          body="따뜻하게 지어낸 솥밥 한 그릇이 상의 중심에서 완성도를 더합니다."
          badge="누룽지 등 실제 제공 방식 확인 필요"
        />
        <StoryBlock
          reverse
          src="/images/food/table-spread.jpg"
          alt="사색찬미의 한 상 전체"
          eyebrow="Food"
          title="이것이 사색찬미의 한 상입니다"
          body="솥밥, 생선, 고기, 정갈한 반찬까지 — 한 상 위에 담긴 구성 하나하나가 정성을 보여줍니다."
          linkHref="/food"
          linkLabel="음식 이야기 자세히 보기"
        />
        <StoryBlock
          src="/images/food/topping.jpg"
          alt="정성으로 마무리하는 밥 한 그릇"
          eyebrow="Finish"
          title="마지막까지 놓치지 않는 정갈함"
          body="정갈한 밑반찬 하나를 올리는 작은 손길까지, 사색찬미의 한 상은 그렇게 완성됩니다."
        />

        <div>
          <h3 className="text-center text-xl font-bold text-foreground">대표 메뉴</h3>
          <div className="mx-auto mt-6 max-w-3xl divide-y divide-secondary overflow-hidden rounded-xl border border-secondary">
            {SIGNATURE_MENU.map((item, index) => (
              <div key={index} className="flex items-baseline justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-semibold text-foreground">{item.name ?? `대표 메뉴 ${index + 1}`}</p>
                  {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
                </div>
                {item.price ? (
                  <p className="whitespace-nowrap text-sm font-semibold text-primary">{item.price}</p>
                ) : (
                  <TodoBadge label={item.todo ?? "확인 필요"} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <LinkButton href="/menu" variant="secondary">
              메뉴 상세 보기
            </LinkButton>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** 06 SPACE — 매장·주차 (요약) */
export function SpaceTeaserSection() {
  return (
    <section className="bg-secondary/30 py-20 sm:py-24">
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
    <section className="bg-background py-20 sm:py-24">
      <Container>
        <div className="text-center">
          <span className={LABEL}>Occasion</span>
          <h2 className={`${H2} mt-3`}>이런 자리에 사색찬미를 추천합니다</h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
    <section className="bg-secondary/30 py-20 sm:py-24">
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
    <section className="bg-background py-20 sm:py-24">
      <Container>
        <span className={LABEL}>Tour</span>
        <h2 className={`${H2} mt-3`}>파주 여행 중 만나는 맛있는 한 끼</h2>
        <p className={`${BODY} mt-4 max-w-2xl`}>{TOUR_DATE_COURSE_INTRO}</p>
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
    <section className="bg-secondary/30 py-20 sm:py-24">
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
    <section className="bg-background py-20 sm:py-24">
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
          {CONTACT.naverPlaceUrl && (
            <a
              href={CONTACT.naverPlaceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary"
            >
              네이버 예약하기
            </a>
          )}
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
