import Link from "next/link";
import { RESERVATION_HREF } from "@/lib/site-config";
import { naverMapUrl, telUrl } from "@/lib/links";

/**
 * 2026-09-22 — 기존 하단 고정 전체폭 바(전화/길찾기/예약) 대신, 매장주 요청으로 화면 우측에
 * 세로로 떠 있는 원형 아이콘 스택으로 교체했다. 콘텐츠를 가리는 폭이 줄어들어 하단 여백
 * 패딩(app/layout.tsx의 pb-16)도 함께 제거했다. 데스크탑에는 노출하지 않는다(md 이상 hidden).
 */
export function MobileFloatingCTA() {
  const phoneHref = telUrl();

  return (
    <div className="fixed bottom-6 right-4 z-40 flex flex-col gap-3 md:hidden">
      {phoneHref ? (
        <a
          href={phoneHref}
          aria-label="전화 문의"
          className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full border border-secondary bg-background text-foreground shadow-lg"
        >
          <span aria-hidden className="text-lg">
            ☎
          </span>
          <span className="text-[10px] font-medium">전화</span>
        </a>
      ) : (
        <span
          aria-disabled
          className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full border border-secondary bg-background text-muted shadow-lg"
        >
          <span aria-hidden className="text-lg">
            ☎
          </span>
          <span className="text-[10px] font-medium">확인중</span>
        </span>
      )}

      <a
        href={naverMapUrl()}
        target="_blank"
        rel="noreferrer"
        aria-label="길찾기"
        className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full border border-secondary bg-background text-foreground shadow-lg"
      >
        <span aria-hidden className="text-lg">
          📍
        </span>
        <span className="text-[10px] font-medium">길찾기</span>
      </a>

      <Link
        href={RESERVATION_HREF}
        aria-label="예약"
        className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full bg-primary text-white shadow-lg"
      >
        <span aria-hidden className="text-lg">
          🍽️
        </span>
        <span className="text-[10px] font-semibold">예약</span>
      </Link>
    </div>
  );
}
