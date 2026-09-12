import { cn } from "@cnbiz/utils";

interface PhotoPlaceholderProps {
  label: string;
  className?: string;
  aspect?: "square" | "wide" | "tall";
}

const ASPECT_STYLES: Record<NonNullable<PhotoPlaceholderProps["aspect"]>, string> = {
  square: "aspect-square",
  wide: "aspect-[16/10]",
  tall: "aspect-[3/4]",
};

/**
 * 실제 사진 수령 전 임시 자리표시자(기획서 13장: "실제 사진이 없는 경우 임시 이미지로
 * 개발하되 배포 전 실제 이미지로 교체"). 스톡 이미지로 대체하지 않고, 배포 전 반드시
 * 실제 사진으로 교체해야 함을 화면에서 그대로 드러낸다.
 */
export function PhotoPlaceholder({ label, className, aspect = "wide" }: PhotoPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`${label} 사진 준비중`}
      className={cn(
        "flex items-center justify-center rounded-xl border border-dashed border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--secondary)_60%,white)] text-center",
        ASPECT_STYLES[aspect],
        className,
      )}
    >
      <span className="px-4 text-sm font-medium text-muted">
        {label}
        <br />
        사진 준비중
      </span>
    </div>
  );
}
