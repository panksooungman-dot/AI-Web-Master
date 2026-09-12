import { ADDRESS, CONTACT } from "./site-config";

/**
 * 실제 네이버 플레이스 URL이 확정되기 전까지 사용할 주소 기반 지도 검색 링크.
 * 매장 확인 후 CONTACT.naverPlaceUrl이 채워지면 그 값을 우선 사용한다.
 */
export function naverMapUrl(): string {
  if (CONTACT.naverPlaceUrl) return CONTACT.naverPlaceUrl;
  return `https://map.naver.com/v5/search/${encodeURIComponent(ADDRESS.full)}`;
}

export function telUrl(): string | null {
  return CONTACT.phone ? `tel:${CONTACT.phone.replace(/[^0-9+]/g, "")}` : null;
}
