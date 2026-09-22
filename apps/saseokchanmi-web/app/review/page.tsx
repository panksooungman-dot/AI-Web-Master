import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { Card } from "@cnbiz/ui";
import { PageHero } from "@/components/ui/PageHero";
import { ReviewCard } from "@/components/ui/ReviewCard";
import { StarRating } from "@/components/ui/StarRating";
import { CUSTOMER_REVIEWS } from "@/lib/content";
import { naverMapUrl } from "@/lib/links";
import { CONTACT, OG_DEFAULTS, OG_IMAGE, seoKeywords } from "@/lib/site-config";

const TITLE = "고객 후기";
const DESCRIPTION = "사색찬미한정식을 방문한 고객들의 이야기.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: seoKeywords("brand", "core"),
  alternates: { canonical: "/review" },
  openGraph: { ...OG_DEFAULTS, title: TITLE, description: DESCRIPTION, url: "/review", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [OG_IMAGE.url] },
};

/**
 * 2026-09-22 — 매장주가 네이버 스마트플레이스 "리뷰 관리" 화면의 실제 HTML을 전달해줘
 * CUSTOMER_REVIEWS(lib/content.ts)에 실제 후기 원문·닉네임·별점·사진을 반영했다(지어낸
 * 내용 없음).
 */
export default function ReviewPage() {
  return (
    <>
      <PageHero eyebrow="Review" title="고객의 이야기" />
      <section className="bg-background py-20">
        <Container>
          <div className="mx-auto max-w-3xl">
            <p className="text-center text-sm leading-relaxed text-muted">
              네이버 플레이스에 등록된 실제 방문 후기입니다. 더 많은 후기는 네이버 플레이스에서
              확인하실 수 있습니다.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {CONTACT.naverAverageRating != null && (
                <Card className="flex flex-col items-center justify-center gap-2 py-8">
                  <p className="text-4xl font-bold text-foreground">
                    {CONTACT.naverAverageRating.toFixed(1)}
                  </p>
                  <StarRating rating={CONTACT.naverAverageRating} className="flex gap-0.5" />
                  <p className="text-xs text-muted">네이버 플레이스 평균 평점</p>
                </Card>
              )}

              <Card className="flex flex-col items-center justify-center gap-2 py-8">
                <span aria-hidden className="text-2xl">
                  🧾
                </span>
                <p className="text-sm font-semibold text-foreground">영수증 인증 후기</p>
                <p className="text-xs leading-relaxed text-muted">
                  실제 방문·결제가 확인된 손님만 남길 수 있는 후기입니다.
                </p>
              </Card>

              <a
                href={naverMapUrl()}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-2 rounded-xl bg-primary py-8 text-white shadow-sm transition-shadow hover:shadow-md"
              >
                <span aria-hidden className="text-2xl">
                  →
                </span>
                <p className="text-sm font-semibold">네이버에서 후기 전체보기</p>
              </a>
            </div>
          </div>

          {CUSTOMER_REVIEWS.length > 0 && (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CUSTOMER_REVIEWS.map((review) => (
                <ReviewCard key={review.author} review={review} />
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
