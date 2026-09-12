"use client";

import { useState } from "react";
import Link from "next/link";
import { MobileDrawer } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";
import { NAV_ITEMS, RESERVATION_HREF } from "@/lib/site-config";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="메뉴 열기"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-secondary text-foreground md:hidden"
        onClick={() => setOpen(true)}
      >
        <svg className="h-5 w-5" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <MobileDrawer open={open} onClose={() => setOpen(false)} label="사이트 메뉴">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">사색찬미한정식</span>
          <button
            type="button"
            aria-label="닫기"
            className="rounded-lg p-2 text-foreground"
            onClick={() => setOpen(false)}
          >
            <svg className="h-5 w-5" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-secondary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <LinkButton
          href={RESERVATION_HREF}
          onClick={() => setOpen(false)}
          className="mt-6 w-full"
        >
          예약 문의
        </LinkButton>
      </MobileDrawer>
    </>
  );
}
