import { useId } from "react";
import { cn } from "@cnbiz/utils";

/**
 * 매장 명함에 있던 전통 문양(구름/여의두 모티프가 반복되는 격자무늬)을 참고해, 저해상도 원본
 * 사진에서 그대로 오려내는 대신 벡터로 다시 그린 은은한 배경 텍스처. 해상도와 무관하게 항상
 * 선명하다. 사이트 전반의 상단 배너(PageHero)·푸터에 공통으로 사용해 톤을 통일한다.
 */
export function TraditionalPattern({ className }: { className?: string }) {
  const patternId = `traditional-cloud-${useId()}`;

  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full text-primary", className)}
    >
      <defs>
        <pattern id={patternId} width="90" height="90" patternUnits="userSpaceOnUse">
          <path
            d="M 18,45 C 18,32 28,22 41,22 C 53,22 63,32 63,45 C 63,55 55,63 45,63 C 39,63 35,59 38,54 C 40,50 44,51 44,55"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
