"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { MobileDrawer } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";
import { NAV_ITEMS, RESERVATION_HREF } from "@/lib/site-config";

/** 메뉴 항목(href)별 아이콘 — 24x24 stroke 아이콘, 장식용이라 aria-hidden. */
const MENU_ICONS: Record<string, ReactNode> = {
  "/about": (
    <>
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2Z" />
      <path d="M12 6.5v13" />
    </>
  ),
  "/menu": (
    <>
      <path d="M6 3v6a2 2 0 0 0 4 0V3" />
      <path d="M8 3v18" />
      <path d="M17 21V3c-2 1.5-3 4-3 7h3" />
    </>
  ),
  "/food": (
    <>
      <path d="M4 11h16a8 8 0 0 1-16 0Z" />
      <path d="M9 21h6" />
      <path d="M9 7c0-1.2 1-1.2 1-2.5M14 7c0-1.2 1-1.2 1-2.5" />
    </>
  ),
  "/occasion": (
    <>
      <path d="M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="8" r="3" />
      <path d="M20 20v-1a4 4 0 0 0-3-3.9" />
      <path d="M15 5.2a3 3 0 0 1 0 5.6" />
    </>
  ),
  "/paju": <path d="m3 19 6-10 4 6 2-3 6 7H3Z" />,
  "/review": <path d="M4 5h16v11H9l-5 4V5Z" />,
  "/location": (
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
};

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
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-secondary"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-secondary bg-white text-primary">
                <svg
                  className="h-5 w-5"
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {MENU_ICONS[item.href]}
                </svg>
              </span>
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
