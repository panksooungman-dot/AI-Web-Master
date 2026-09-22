import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { Card } from "@cnbiz/ui";
import { PageHero } from "@/components/ui/PageHero";
import { StarRating } from "@/components/ui/StarRating";
import { REVIEWS } from "@/lib/content";
import { naverMapUrl } from "@/lib/links";
import { CONTACT, seoKeywords } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "고객 후기",
  description: "사색찬미한정식을 방문한 고객들의 이야기.",
  keywords: seoKeywords("brand", "core"),
  alternates: { canonical: "/review" },
};

export default function ReviewPage() {
  return (
    <>
      <PageHero eyebrow="Review" title="고객의 이야기" />
      <section className="bg-background py-20">
        <Container>
          {REVIEWS.length === 0 ? (
            <div className="mx-auto max-w-3xl">
              <p className="text-center text-sm leading-relaxed text-muted">
                후기 원문은 출처·사용 범위 확인 후 이 페이지에 직접 등록됩니다. 지금은 네이버
                플레이스에 등록된 실제 방문 후기를 아래에서 확인하실 수 있습니다.
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
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {REVIEWS.map((review, index) => (
                <Card key={index}>
                  <p className="text-sm font-semibold text-primary">{review.visitPurpose}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{review.body}</p>
                  <p className="mt-3 text-xs text-muted">— {review.author}</p>
                </Card>
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
