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
 * 필터로 무채색 인상만 남기고 일반적인 문서 워터마크 수준으로 조정했다.
 * 2026-09-13 — 가운데 로고 하나만 있던 것을 카드 전체를 채우는 반복 타일 패턴으로 변경
 * (투명도는 그대로 유지) — 실제 공문서·계약서 워터마크처럼 카드 전체에 빈틈없이 깔린다.
 * next/image는 반복 배경 이미지 용도에 맞지 않아(고정 크기 하나만 렌더링) 순수 CSS
 * background-repeat로 구현.
 */
export function DocumentWatermark({ opacity = 0.12 }: DocumentWatermarkProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        opacity,
        filter: "grayscale(1)",
        backgroundImage: "url(/images/logo.png)",
        backgroundRepeat: "repeat",
        backgroundSize: "96px 96px",
      }}
    />
  );
}
