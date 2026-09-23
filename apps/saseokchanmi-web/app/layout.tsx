import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileFloatingCTA } from "@/components/layout/MobileFloatingCTA";
import {
  ADDRESS,
  BLOG_URL,
  CONTACT,
  OG_DEFAULTS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  seoKeywords,
} from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_TAGLINE} | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: seoKeywords("brand", "core", "gwangtan"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    ...OG_DEFAULTS,
    title: `${SITE_TAGLINE} | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_TAGLINE} | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    // 2026-09-22 — 매장주가 네이버 서치어드바이저에서 발급받은 소유 확인 코드.
    other: {
      "naver-site-verification": "48d1759371bf2dbd946bfdfd31b3403946cfbe9b",
    },
    // 2026-09-23 — 매장주가 구글 서치콘솔(URL 접두어 방식)에서 발급받은 소유 확인 코드.
    google: "LewFF204UODbVCe_FJblBT1E-uksBlvL2c80c4TemFM",
  },
};

/**
 * 확인된 사실만 구조화 데이터에 포함한다. telephone·openingHoursSpecification·image·
 * sameAs는 2026-09-21~22 매장주가 직접 확인해준 CONTACT/BLOG_URL 값을 그대로 반영했다
 * (이전에는 전화번호·영업시간이 미확인 상태라 생략했었으나 이제 전부 확정됨).
 * aggregateRating(평점 개수 포함)은 실제 리뷰 총 개수를 확인하지 못해 지어내지 않고 생략.
 */
const restaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: SITE_NAME,
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image`,
  servesCuisine: "한정식",
  telephone: CONTACT.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: ADDRESS.full,
    addressRegion: "경기도",
    addressCountry: "KR",
  },
  // CONTACT.businessHours("매일 10:00 ~ 19:30")·closedDays("연중무휴")와 동일한 사실.
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    opens: "10:00",
    closes: "19:30",
  },
  sameAs: [CONTACT.naverPlaceUrl, BLOG_URL].filter((url): url is string => Boolean(url)),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="scroll-smooth antialiased">
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
        />
        <Header />
        <main className="flex-1 pr-14 md:pr-0">{children}</main>
        <Footer />
        <MobileFloatingCTA />
      </body>
    </html>
  );
}
