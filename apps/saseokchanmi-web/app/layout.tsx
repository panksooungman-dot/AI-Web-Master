import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomCTA } from "@/components/layout/MobileBottomCTA";
import { ADDRESS, OG_DEFAULTS, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, seoKeywords } from "@/lib/site-config";

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
};

// 확인된 사실(상호·주소)만 구조화 데이터에 포함한다. 전화번호·영업시간은 매장 확인 전까지 생략.
const restaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: SITE_NAME,
  url: SITE_URL,
  servesCuisine: "한정식",
  address: {
    "@type": "PostalAddress",
    streetAddress: ADDRESS.full,
    addressRegion: "경기도",
    addressCountry: "KR",
  },
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
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <Footer />
        <MobileBottomCTA />
      </body>
    </html>
  );
}
