import Link from "next/link";
import { RESERVATION_HREF } from "@/lib/site-config";
import { naverMapUrl, telUrl } from "@/lib/links";

/**
 * 기획서 3장·7장: "모바일에서는 하단 고정 CTA를 통해 어느 위치에서도 '전화 / 길찾기 / 예약'을
 * 실행할 수 있게 한다." 데스크탑에는 노출하지 않는다(md 이상 hidden).
 */
export function MobileBottomCTA() {
  const phoneHref = telUrl();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-secondary bg-background shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
      {phoneHref ? (
        <a href={phoneHref} className="flex flex-col items-center gap-0.5 py-3 text-xs font-medium text-foreground">
          <span aria-hidden>☎</span>
          전화
        </a>
      ) : (
        <span className="flex flex-col items-center gap-0.5 py-3 text-xs font-medium text-muted" aria-disabled>
          <span aria-hidden>☎</span>
          전화(확인중)
        </span>
      )}

      <a
        href={naverMapUrl()}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col items-center gap-0.5 border-x border-secondary py-3 text-xs font-medium text-foreground"
      >
        <span aria-hidden>📍</span>
        길찾기
      </a>

      <Link
        href={RESERVATION_HREF}
        className="flex flex-col items-center gap-0.5 bg-primary py-3 text-xs font-semibold text-white"
      >
        <span aria-hidden>🍽️</span>
        예약
      </Link>
    </div>
  );
}
