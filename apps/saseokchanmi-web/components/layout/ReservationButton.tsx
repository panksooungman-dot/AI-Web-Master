"use client";

import { LinkButton } from "@cnbiz/ui";
import type { ReactNode } from "react";
import { useReservationLink } from "./useReservationLink";

/** 헤더용 "예약 문의" 버튼 — 링크 대상은 useReservationLink 참고. */
export function ReservationButton({ className, children }: { className?: string; children: ReactNode }) {
  const link = useReservationLink();
  return (
    <LinkButton {...link} className={className}>
      {children}
    </LinkButton>
  );
}
