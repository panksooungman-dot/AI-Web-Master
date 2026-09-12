import { cn } from "@cnbiz/utils";

interface TodoBadgeProps {
  label: string;
  className?: string;
}

/** 매장 확인이 필요한 정보 옆에 붙이는 안내 배지. 실제 값을 지어내는 대신 명시적으로 표시한다. */
export function TodoBadge({ label, className }: TodoBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-dashed border-amber-400 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700",
        className,
      )}
    >
      TODO · {label}
    </span>
  );
}
