import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.seoTitle,
    template: `%s | ${siteConfig.projectName}`
  },
  description: siteConfig.seoDescription,
  manifest: "/manifest.json",
  openGraph: {
    title: siteConfig.seoTitle,
    description: siteConfig.seoDescription,
    siteName: siteConfig.projectName,
    url: siteConfig.url,
    locale: siteConfig.languageCode,
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.seoTitle,
    description: siteConfig.seoDescription
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={siteConfig.languageCode}>
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <JsonLd />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
