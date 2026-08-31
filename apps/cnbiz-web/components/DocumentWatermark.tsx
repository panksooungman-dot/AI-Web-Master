import Image from "next/image";

interface DocumentWatermarkProps {
  /** 0~1. 밝은 배경 카드는 낮게(기본값), 어두운 배경 카드는 조금 더 진하게 지정한다. */
  opacity?: number;
}

/**
 * 견적서·기능명세서·프로젝트 일정 등 공식 문서 카드 배경에 까는 워터마크. 부모 요소에
 * `relative overflow-hidden`을 지정한 뒤 콘텐츠보다 먼저 렌더링하면 된다(음수 z-index로
 * 항상 본문 텍스트 아래에 위치).
 *
 * 로고 원본이 유채색(핑크·블루)이라 낮은 opacity에서도 색이 도드라져 보였다 — grayscale
 * 필터로 무채색 인상만 남기고, 카드 대비 지나치게 크던 크기도 줄여 일반적인 문서 워터마크
 * 수준으로 조정했다.
 */
export function DocumentWatermark({ opacity = 0.05 }: DocumentWatermarkProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
    >
      <Image
        src="/images/logo.png"
        alt=""
        width={280}
        height={280}
        style={{ opacity, filter: "grayscale(1)" }}
        className="h-32 w-32 sm:h-44 sm:w-44"
      />
    </div>
  );
}
