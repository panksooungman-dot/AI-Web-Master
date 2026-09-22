import Image from "next/image";
import { Card } from "@cnbiz/ui";
import type { CustomerReview } from "@/lib/content";

interface ReviewCardProps {
  review: CustomerReview;
  className?: string;
}

/** 네이버 플레이스 실제 후기 1건을 카드로 표시한다(원문 그대로, 지어낸 내용 없음). */
export function ReviewCard({ review, className }: ReviewCardProps) {
  return (
    <Card className={`flex h-full flex-col gap-3 ${className ?? ""}`}>
      {review.photo && (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-secondary/30">
          <Image
            src={review.photo}
            alt={`${review.author} 님이 남긴 후기 사진`}
            fill
            className="object-cover"
            sizes="(min-width: 640px) 320px, 90vw"
          />
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-semibold text-foreground">{review.author}</span>
        <span className="flex items-center gap-1">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-primary" aria-hidden>
            <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.9l-5.2 2.61.99-5.79-4.21-4.1 5.82-.85z" />
          </svg>
          {review.rating.toFixed(1)}
        </span>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted line-clamp-6">{review.text}</p>
      <p className="mt-auto text-xs text-muted">{review.visitDate} 방문 · 네이버 영수증 인증 후기</p>
    </Card>
  );
}
