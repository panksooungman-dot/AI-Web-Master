interface StarRatingProps {
  /** 5점 만점 기준 평점 (예: 4.2). */
  rating: number;
  className?: string;
}

/** 네이버 플레이스 평균 평점을 5개의 별로 시각화한다. 소수점은 반올림해 채움 정도로 표현한다. */
export function StarRating({ rating, className }: StarRatingProps) {
  const filled = Math.round(rating);

  return (
    <div className={className} aria-label={`5점 만점에 ${rating}점`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          viewBox="0 0 20 20"
          className={`inline-block h-5 w-5 ${index < filled ? "fill-primary" : "fill-secondary"}`}
          aria-hidden
        >
          <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.9l-5.2 2.61.99-5.79-4.21-4.1 5.82-.85z" />
        </svg>
      ))}
    </div>
  );
}
