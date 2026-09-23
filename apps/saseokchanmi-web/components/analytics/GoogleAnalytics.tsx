import Script from "next/script";

/**
 * 2026-09-23 — 매장주가 구글 애널리틱스(analytics.google.com)에서 발급받은
 * gtag.js 태그(측정 ID). 두 스크립트를 별도 afterInteractive Script로 나눈 표준 방식 —
 * gtag()는 dataLayer 큐에 쌓기만 하므로 gtag.js 로딩 완료 여부와 무관하게 순서가
 * 안전하다(Naver wcslog.js의 `if(window.wcs)` 체크와 달리 onLoad 콜백이 필요 없다).
 */
const GA_MEASUREMENT_ID = "G-DWFBHC6LNG";

export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
