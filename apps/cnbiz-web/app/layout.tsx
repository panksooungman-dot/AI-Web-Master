import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { WorkspaceStoreProvider } from "@/lib/store/workspace-store";
import { OG_DEFAULTS, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site-config";
import { DevInspectorOverlay } from "@cnbiz/dev-inspector";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | CNBIZ",
  },
  description: SITE_DESCRIPTION,
  keywords: ["디지털 전환", "IT 컨설팅", "AI 솔루션", "엔터프라이즈 개발", "클라우드", "CNBIZ"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    ...OG_DEFAULTS,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const isProduction = process.env.NODE_ENV === "production";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="scroll-smooth antialiased">
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Header />
        <main className="flex-1">
          <AuthProvider>
            <WorkspaceStoreProvider>{children}</WorkspaceStoreProvider>
          </AuthProvider>
        </main>
        <Footer />
        <DevInspectorOverlay />
      </body>
      {isProduction && gaMeasurementId ? (
        <GoogleAnalytics gaId={gaMeasurementId} />
      ) : null}
    </html>
  );
}
