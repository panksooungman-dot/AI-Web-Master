"use client";

import { usePathname } from "next/navigation";
import { CONTACT, RESERVATION_HREF } from "@/lib/site-config";

/**
 * 헤더·모바일 메뉴·플로팅 "예약" 버튼 공용 링크.
 *
 * 2026-11-10 — 이 버튼들은 전부 /reservation(예약 안내) 페이지로 연결되는데, 이미 그
 * 페이지에 있을 때 누르면 같은 페이지로 가는 것이라 아무 반응이 없어 "버튼이 안 눌린다"는
 * 매장주 제보가 있었다. 예약 안내 페이지에 있을 때만 이 버튼이 곧바로 네이버 예약(새 탭)으로
 * 이어지도록 한다. 다른 페이지에서는 기존처럼 예약 안내 페이지로 이동한다.
 */
export function useReservationLink(): { href: string; target?: "_blank"; rel?: string } {
  const pathname = usePathname();
  if (pathname === RESERVATION_HREF && CONTACT.naverBookingUrl) {
    return { href: CONTACT.naverBookingUrl, target: "_blank", rel: "noreferrer" };
  }
  return { href: RESERVATION_HREF };
}
