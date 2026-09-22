import { cn } from "@cnbiz/utils";
import { ADDRESS } from "@/lib/site-config";

interface LocationMapProps {
  className?: string;
}

/**
 * 별도 API 키 없이 쓸 수 있는 Google 지도 검색 임베드로 실제 매장 위치를 보여준다.
 * 국내 주소는 네이버 지도가 더 정확하지만, 네이버 지도 임베드는 API 키(Client ID) 발급이
 * 필요해 이번 범위에서는 제외 — 상세 길찾기는 여전히 네이버 지도 링크(naverMapUrl())로 연결한다.
 */
export function LocationMap({ className }: LocationMapProps) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS.full)}&output=embed`;

  return (
    <div className={cn("aspect-[16/10] overflow-hidden rounded-xl border border-secondary", className)}>
      <iframe
        src={src}
        title="사색찬미한정식 위치 지도"
        loading="lazy"
        className="h-full w-full"
        style={{ border: 0 }}
      />
    </div>
  );
}
