"use client";

import { usePathname } from "next/navigation";

/**
 * 근로계약서 관리자(/admin)·근로자(/contract) 화면에서는 사이트 머리글·바닥글·떠 있는 버튼·방문 통계 스크립트를 쓰지 않는다.
 * 계약 링크의 주소에는 접근 토큰이 들어 있고 화면에는 개인정보가 나오므로, 방문 통계 서비스로 새어 나가면 안 된다.
 */
const PLAIN_PREFIXES = ["/admin", "/contract"];

export const isPlainPath = (pathname: string | null): boolean => !!pathname && PLAIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

/** 일반 사이트 화면에서만 children을 보여 준다. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return isPlainPath(usePathname()) ? null : <>{children}</>;
}

/** 본문 영역. 떠 있는 버튼이 없는 화면에서는 오른쪽 여백을 두지 않는다. */
export function SiteMain({ children }: { children: React.ReactNode }) {
  const plain = isPlainPath(usePathname());
  return <main className={plain ? "flex-1" : "flex-1 pr-14 md:pr-0"}>{children}</main>;
}
