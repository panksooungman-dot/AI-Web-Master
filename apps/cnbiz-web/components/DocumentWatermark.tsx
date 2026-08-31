import Image from "next/image";

interface DocumentWatermarkProps {
  /** 0~1. 밝은 배경 카드는 낮게(기본값), 어두운 배경 카드는 조금 더 진하게 지정한다. */
  opacity?: number;
}

/**
 * 견적서·기능명세서·프로젝트 일정 등 공식 문서 카드 배경에 까는 워터마크. 부모 요소에
 * `relative overflow-hidden`을 지정한 뒤 콘텐츠보다 먼저 렌더링하면 된다(음수 z-index로
 * 항상 본문 텍스트 아래에 위치).
 */
export function DocumentWatermark({ opacity = 0.06 }: DocumentWatermarkProps) {
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
        style={{ opacity }}
        className="h-56 w-56 sm:h-72 sm:w-72"
      />
    </div>
  );
}
