import Script from "next/script";

/**
 * 2026-09-23 — 매장주가 구글 애널리틱스(analytics.google.com)에서 발급받은
 * gtag.js 태그(측정 ID). 두 스크립트를 별도 afterInteractive Script로 나눈 표준 방식 —
 * gtag()는 dataLayer 큐에 쌓기만 하므로 gtag.js 로딩 완료 여부와 무관하게 순서가
 * 안전하다(Naver wcslog.js의 `if(window.wcs)` 체크와 달리 onLoad 콜백이 필요 없다).
 */
const GA_MEASUREMENT_ID = "G-DWFBHC6LNG";

/**
 * 2026-09-25 — 매장주가 Google Ads 캠페인("파주 광탄 정통 한정식")의 "길찾기" 목표
 * 설정 과정에서 발급받은 전환 추적용 태그 ID. GA4 태그와 같은 gtag.js 스크립트를
 * 공유하고 config 호출만 추가하는 구글 공식 권장 방식(스크립트 중복 로드 없음).
 */
const GOOGLE_ADS_TAG_ID = "AW-18469635437";

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
gtag('config', '${GOOGLE_ADS_TAG_ID}');
        `}
      </Script>
    </>
  );
}
