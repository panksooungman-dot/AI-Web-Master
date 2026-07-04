import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: {
    default: "CNBIZ - 디지털 혁신 파트너",
    template: "%s | CNBIZ",
  },
  description:
    "CNBIZ는 기업의 디지털 전환을 이끄는 IT 전문 기업입니다. 디지털 전환 컨설팅, AI/ML 솔루션, 엔터프라이즈 개발, 클라우드 인프라 서비스를 제공합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="scroll-smooth antialiased">
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
