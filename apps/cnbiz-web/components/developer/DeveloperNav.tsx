"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { componentMarker } from "@/lib/dev/component-marker";
import { useAuth } from "@/lib/auth/AuthContext";
import { roleCanAccessArea } from "@/lib/auth/rbac";

interface NavLink {
  href: string;
  label: string;
}

interface NavGroup {
  title: string;
  links: NavLink[];
}

/** 의뢰 하나가 실제로 지나가는 흐름(접수→기획→디자인→개발/배포→운영) 순서로 묶는다.
 *  "부서"가 아니라 "단계"로 나눈 이유: 이 팀은 부서별로 나뉜 대규모 조직이 아니라 소수
 *  인원(+AI)이 의뢰 하나를 처음부터 끝까지 처리하는 구조라, 업무 흐름 순서가 실제
 *  사용 패턴과 더 잘 맞는다(PROJECT_VISION.md 참고). */
const NAV_GROUPS: NavGroup[] = [
  {
    title: "접수",
    links: [
      { href: "/developer/inquiries", label: "AI 의뢰 관리" },
      { href: "/developer/clients", label: "고객사 관리" },
    ],
  },
  {
    title: "기획",
    links: [
      { href: "/developer/analysis", label: "Analysis" },
      { href: "/developer/planning", label: "Planning" },
      { href: "/developer/estimates", label: "기술 견적서" },
      { href: "/developer/specifications", label: "기능 명세서" },
      { href: "/developer/timeline", label: "프로젝트 일정" },
      { href: "/developer/contracts", label: "계약서" },
      { href: "/developer/proposals", label: "제안서" },
      { href: "/developer/launch-requests", label: "정보 요청서" },
    ],
  },
  {
    title: "디자인",
    links: [{ href: "/developer/design", label: "Design" }],
  },
  {
    title: "개발 / 배포",
    links: [
      { href: "/projects", label: "프로젝트 관리" },
      { href: "/developer/workspace", label: "Workspace" },
      { href: "/developer/terminal", label: "Terminal" },
      { href: "/developer/github", label: "GitHub" },
      { href: "/developer/websites", label: "Website Builder" },
      { href: "/developer/workflows", label: "Workflow Center" },
      { href: "/developer/deployment", label: "Deployment" },
    ],
  },
  {
    title: "운영",
    links: [
      { href: "/developer/logs", label: "Logs" },
      { href: "/developer/health", label: "Health" },
      { href: "/developer/audit-log", label: "Audit Log" },
      { href: "/developer/metrics", label: "Metrics" },
      { href: "/developer/backup", label: "Backup" },
      { href: "/developer/errors", label: "Error Report" },
    ],
  },
  {
    title: "도구",
    links: [
      { href: "/developer/ai", label: "AI Workspace" },
      { href: "/developer/prompts", label: "Prompt Library" },
      { href: "/developer/marketplace", label: "Marketplace" },
      { href: "/developer/ui-map", label: "UI Explorer" },
      { href: "/developer/settings", label: "Settings" },
    ],
  },
];

function isLinkActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DeveloperNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  // 모바일에서는 30개 가까운 링크가 항상 펼쳐져 있어 페이지 진입 시마다 본문까지
  // 스크롤을 많이 내려야 했다. 기본은 접어두고(현재 위치만 버튼에 표시) 탭했을 때만
  // 펼치는 방식으로 전환 — md 이상(데스크탑 2단 레이아웃)에서는 항상 펼쳐진 상태 유지.
  const [isOpen, setIsOpen] = useState(false);

  const currentLabel = useMemo(() => {
    if (!pathname) return "메뉴";
    if (pathname === "/developer") return "Dashboard";
    for (const group of NAV_GROUPS) {
      const match = group.links.find((link) => isLinkActive(pathname, link.href));
      if (match) return match.label;
    }
    return "메뉴";
  }, [pathname]);

  const activeGroupTitle = useMemo(() => {
    if (!pathname) return null;
    return NAV_GROUPS.find((group) => group.links.some((link) => isLinkActive(pathname, link.href)))?.title ?? null;
  }, [pathname]);

  // 카테고리(그룹) 헤더를 눌러야 그 하위 메뉴만 펼쳐지는 아코디언 — 여러 그룹을 동시에
  // 펴놓을 수 있도록 그룹마다 독립적으로 토글한다(하나를 열어도 다른 그룹이 닫히지 않음).
  // 초기값·경로 이동 시에는 현재 위치가 속한 그룹을 항상 펼친 상태로 보정하되, 사용자가
  // 이미 펼쳐둔 다른 그룹은 그대로 유지한다.
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(activeGroupTitle ? [activeGroupTitle] : [])
  );

  useEffect(() => {
    if (!activeGroupTitle) return;
    queueMicrotask(() => {
      setOpenGroups((prev) => (prev.has(activeGroupTitle) ? prev : new Set(prev).add(activeGroupTitle)));
    });
  }, [activeGroupTitle]);

  function toggleGroup(title: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  }

  // Release Hardening (v1.0) — RBAC: the server (proxy.ts) already blocks /developer/** for
  // roles without access; this is defense-in-depth so the nav itself never renders for them
  // during a client-side transition (e.g. a role change mid-session).
  if (user && !roleCanAccessArea(user.role, "developer")) {
    return null;
  }

  return (
    <nav
      className="w-full shrink-0 border-b border-gray-800 pb-3 md:w-56 md:border-b-0 md:border-r md:pb-0 md:pr-4"
      {...componentMarker("DeveloperNav", "components/developer/DeveloperNav.tsx")}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="developer-nav-links"
        className="flex w-full items-center justify-between rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white md:hidden"
      >
        <span className="truncate">{currentLabel}</span>
        <span aria-hidden className={`ml-2 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      <div
        id="developer-nav-links"
        className={`${isOpen ? "flex" : "hidden"} flex-col gap-6 pt-3 md:flex md:pt-0`}
      >
        <Link
          href="/developer"
          onClick={() => setIsOpen(false)}
          className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
            pathname === "/developer"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-white"
          }`}
        >
          Dashboard
        </Link>

        {NAV_GROUPS.map((group, groupIndex) => {
          const isGroupOpen = openGroups.has(group.title);
          const groupPanelId = `developer-nav-group-${groupIndex}`;

          return (
            <div key={group.title}>
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                aria-expanded={isGroupOpen}
                aria-controls={groupPanelId}
                className="mb-1.5 flex w-full items-center justify-between px-3 text-xs font-semibold uppercase tracking-widest text-gray-600 transition-colors hover:text-gray-400"
              >
                <span>{group.title}</span>
                <span aria-hidden className={`transition-transform ${isGroupOpen ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {isGroupOpen && (
                <div id={groupPanelId} className="flex flex-col gap-0.5">
                  {group.links.map((link) => {
                    const isActive = isLinkActive(pathname ?? "", link.href);

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "text-gray-400 hover:bg-gray-800 hover:text-white"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
