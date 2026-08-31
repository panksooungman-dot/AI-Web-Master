"use client";

import { useState } from "react";
import { MobileDrawer } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";
import { CNBIZ_AI_URL } from "@/lib/links";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="메뉴 열기"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-900"
        onClick={() => setOpen(true)}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <MobileDrawer open={open} onClose={() => setOpen(false)} label="주요 메뉴">
        <nav className="flex flex-col gap-6" aria-label="주요 메뉴 (모바일)">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-slate-900">
              CN<span className="text-primary">BIZ</span>
            </span>
            <button
              type="button"
              aria-label="닫기"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500"
              onClick={() => setOpen(false)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <LinkButton
              href={CNBIZ_AI_URL}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              포트폴리오 보기
            </LinkButton>
            <LinkButton href="/contact" onClick={() => setOpen(false)}>
              프로젝트 문의하기
            </LinkButton>
          </div>
        </nav>
      </MobileDrawer>
    </div>
  );
}
