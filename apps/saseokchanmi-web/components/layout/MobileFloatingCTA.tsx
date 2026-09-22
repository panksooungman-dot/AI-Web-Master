import Link from "next/link";
import { RESERVATION_HREF } from "@/lib/site-config";
import { naverMapUrl, telUrl } from "@/lib/links";

/**
 * 2026-09-22 — 기존 하단 고정 전체폭 바(전화/길찾기/예약) 대신, 매장주 요청으로 화면 우측에
 * 세로로 떠 있는 원형 아이콘 스택으로 교체했다. 콘텐츠를 가리는 폭이 줄어들어 하단 여백
 * 패딩(app/layout.tsx의 pb-16)도 함께 제거했다. 데스크탑에는 노출하지 않는다(md 이상 hidden).
 *
 * 버튼 크기를 56px→48px로 줄여, 콘텐츠 우측에 확보해야 하는 여백(app/layout.tsx의 pr-14)도
 * 함께 줄였다 — 여백이 클수록 본문 폭이 좁아져 제목이 불필요하게 여러 줄로 꺾이기 때문.
 */
export function MobileFloatingCTA() {
  const phoneHref = telUrl();

  return (
    <div className="fixed bottom-5 right-3 z-40 flex flex-col gap-2 md:hidden">
      {phoneHref ? (
        <a
          href={phoneHref}
          aria-label="전화 문의"
          className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full border border-secondary bg-background text-foreground shadow-lg"
        >
          <span aria-hidden className="text-base">
            ☎
          </span>
          <span className="text-[9px] font-medium">전화</span>
        </a>
      ) : (
        <span
          aria-disabled
          className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full border border-secondary bg-background text-muted shadow-lg"
        >
          <span aria-hidden className="text-base">
            ☎
          </span>
          <span className="text-[9px] font-medium">확인중</span>
        </span>
      )}

      <a
        href={naverMapUrl()}
        target="_blank"
        rel="noreferrer"
        aria-label="길찾기"
        className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full border border-secondary bg-background text-foreground shadow-lg"
      >
        <span aria-hidden className="text-base">
          📍
        </span>
        <span className="text-[9px] font-medium">길찾기</span>
      </a>

      <Link
        href={RESERVATION_HREF}
        aria-label="예약"
        className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full bg-primary text-white shadow-lg"
      >
        <span aria-hidden className="text-base">
          🍽️
        </span>
        <span className="text-[9px] font-semibold">예약</span>
      </Link>
    </div>
  );
}
