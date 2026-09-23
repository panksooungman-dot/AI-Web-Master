"use client";

import Script from "next/script";

/**
 * 2026-09-23 — 매장주가 네이버 애널리틱스(analytics.naver.com)에서 발급받은 추적 스크립트.
 * 원본 스니펫은 `if(window.wcs)` 체크로 "wcslog.js가 이미 로드된 경우에만 wcs_do()를
 * 직접 호출"하는 순서를 가정한다 — next/script의 onLoad 콜백으로 그 순서를 그대로
 * 재현해, wcslog.js가 완전히 로드된 뒤에만 wcs_add를 설정하고 wcs_do()를 호출한다.
 */
export function NaverAnalytics() {
  return (
    <Script
      src="https://wcs.pstatic.net/wcslog.js"
      strategy="afterInteractive"
      onLoad={() => {
        const w = window as typeof window & {
          wcs_add?: Record<string, string>;
          wcs_do?: () => void;
        };
        w.wcs_add = w.wcs_add ?? {};
        w.wcs_add["wa"] = "1c19ca45430a980";
        w.wcs_do?.();
      }}
    />
  );
}
