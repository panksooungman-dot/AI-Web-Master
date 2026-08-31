"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";

/** 이 경로로 시작하는 페이지는 사이트 헤더·푸터 없이 콘텐츠만 노출한다. */
const CHROMELESS_PREFIXES = ["/quote/"];

/**
 * 의뢰자 공개 문서(`/quote/[token]`)처럼 사이트 네비게이션 없이 문서만 보여줘야 하는
 * 페이지를 위한 조건부 Header/Footer 래퍼. Header·Footer 자체는 Server Component로 유지하고,
 * 경로 판단만 이 Client Component가 담당한다.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChromeless = CHROMELESS_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  if (isChromeless) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
