"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { componentMarker } from "@/lib/dev/component-marker";

interface DesignStage {
  href: string;
  label: string;
}

/** Design Automation 파이프라인의 전체 단계. 순서를 바꾸면 페이지 이동 순서도 바뀐다. */
const DESIGN_STAGES: DesignStage[] = [
  { href: "/developer/design", label: "Requirements" },
  { href: "/developer/design/storyboard", label: "Storyboard" },
  { href: "/developer/design/wireframe", label: "Wireframe" },
  { href: "/developer/design/prototype", label: "Prototype" },
  { href: "/developer/design/claude", label: "Claude Design" },
  { href: "/developer/design/review", label: "Review" },
  { href: "/developer/design/figma", label: "Figma" },
  { href: "/developer/design/sync", label: "Design Sync" },
  { href: "/developer/design/website", label: "Website Build" },
];

/**
 * 각 Design 체인 페이지 상단에 표시하는 전체 단계 진행 표시줄. 잘못된 단계로 넘어갔거나
 * 이전 단계로 되돌아가고 싶을 때, 인접 단계로만 이동 가능한 기존 "← 이전 / 다음 →"
 * 텍스트 링크(PageHeader actions)와 별개로 어느 단계로든 즉시 이동할 수 있게 한다.
 * 각 페이지의 데이터 로딩·생성 로직은 건드리지 않는 순수 네비게이션 컴포넌트.
 */
export function DesignChainStepper() {
  const pathname = usePathname();
  const currentIndex = DESIGN_STAGES.findIndex((stage) => stage.href === pathname);

  return (
    <nav
      aria-label="Design 체인 단계"
      className="mb-6 flex flex-wrap items-center gap-x-1 gap-y-2 overflow-x-auto rounded border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs"
      {...componentMarker("DesignChainStepper", "components/developer/design/DesignChainStepper.tsx")}
    >
      {DESIGN_STAGES.map((stage, index) => {
        const isCurrent = index === currentIndex;
        const isPast = currentIndex >= 0 && index < currentIndex;

        return (
          <span key={stage.href} className="flex items-center gap-1">
            {index > 0 && <span className="text-gray-700" aria-hidden>→</span>}
            <Link
              href={stage.href}
              aria-current={isCurrent ? "step" : undefined}
              className={`whitespace-nowrap rounded px-2 py-1 font-semibold transition-colors ${
                isCurrent
                  ? "bg-blue-600 text-white"
                  : isPast
                    ? "text-blue-400 hover:bg-gray-800 hover:underline"
                    : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
              }`}
            >
              {index + 1}. {stage.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
