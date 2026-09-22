import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@cnbiz/layout-primitives";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { TodoBadge } from "@/components/ui/TodoBadge";
import { PageHero } from "@/components/ui/PageHero";
import { SEATING_OPTIONS, SPACE_PHOTOS } from "@/lib/content";
import { CONTACT, OG_DEFAULTS, OG_IMAGE, seoKeywords } from "@/lib/site-config";

const TITLE = "매장·주차 안내";
const DESCRIPTION = "사색찬미한정식의 매장 공간과 주차 안내입니다.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: seoKeywords("occasion"),
  alternates: { canonical: "/space" },
  openGraph: { ...OG_DEFAULTS, title: TITLE, description: DESCRIPTION, url: "/space", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [OG_IMAGE.url] },
};

export default function SpacePage() {
  return (
    <>
      <PageHero
        eyebrow="Space"
        title="편안하게 머무를 수 있는 공간"
        description="방문 전 공간에 대한 불안을 줄이는 것을 목표로 합니다."
      />
      <section className="bg-background py-20">
        <Container>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SPACE_PHOTOS.map((photo) =>
              photo.image ? (
                <figure key={photo.label}>
                  <div className="relative aspect-square overflow-hidden rounded-xl">
                    <Image
                      src={photo.image}
                      alt={photo.caption ?? photo.label}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="mt-3 text-sm font-medium text-foreground">{photo.caption}</figcaption>
                </figure>
              ) : (
                <PhotoPlaceholder key={photo.label} label={photo.label} aspect="square" />
              ),
            )}
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {SEATING_OPTIONS.map((option) => (
              <div key={option.label} className="rounded-xl border border-primary/20 bg-secondary/30 p-6">
                <p className="font-semibold text-foreground">{option.label}</p>
                <p className="mt-2 text-sm text-muted">{option.capacity}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-primary/30 bg-secondary/30 p-6 text-sm leading-relaxed text-muted">
            <p className="font-semibold text-foreground">주차 안내</p>
            <p className="mt-2">
              {CONTACT.parkingInfo ?? "실제 주차 가능 대수·방식은 매장 확인 후 안내해 드립니다."}
            </p>
            {!CONTACT.parkingInfo && <TodoBadge label="주차 조건 확인 필요" className="mt-3" />}
          </div>
        </Container>
      </section>
    </>
  );
}
