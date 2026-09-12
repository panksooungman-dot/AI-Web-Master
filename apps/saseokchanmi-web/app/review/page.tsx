import type { Metadata } from "next";
import { Container } from "@cnbiz/layout-primitives";
import { Card } from "@cnbiz/ui";
import { PageHero } from "@/components/ui/PageHero";
import { REVIEWS } from "@/lib/content";
import { naverMapUrl } from "@/lib/links";
import { seoKeywords } from "@/lib/site-config";

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
            <div className="rounded-xl border border-dashed border-primary/30 bg-secondary/30 p-10 text-center">
              <p className="text-base font-semibold text-foreground">고객 후기를 준비하고 있습니다.</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                실제 방문객의 후기는 출처와 사용 범위 확인 후 등록됩니다. 최신 후기는 네이버
                플레이스에서 바로 확인하실 수 있습니다.
              </p>
              <a
                href={naverMapUrl()}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center text-sm font-semibold text-primary hover:underline"
              >
                네이버 플레이스에서 후기 보기 →
              </a>
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
