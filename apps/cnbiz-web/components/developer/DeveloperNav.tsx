"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      { href: "/developer/requests", label: "의뢰 관리" },
      { href: "/developer/inquiries", label: "AI 의뢰 관리" },
      { href: "/developer/clients", label: "고객사 관리" },
      { href: "/developer/website-orders", label: "주문 관리" },
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

export function DeveloperNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Release Hardening (v1.0) — RBAC: the server (proxy.ts) already blocks /developer/** for
  // roles without access; this is defense-in-depth so the nav itself never renders for them
  // during a client-side transition (e.g. a role change mid-session).
  if (user && !roleCanAccessArea(user.role, "developer")) {
    return null;
  }

  return (
    <nav
      className="flex w-full shrink-0 flex-col gap-6 border-b border-gray-800 pb-6 lg:w-56 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4"
      {...componentMarker("DeveloperNav", "components/developer/DeveloperNav.tsx")}
    >
      <Link
        href="/developer"
        className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
          pathname === "/developer"
            ? "bg-blue-600 text-white"
            : "text-gray-400 hover:bg-gray-800 hover:text-white"
        }`}
      >
        Dashboard
      </Link>

      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-widest text-gray-600">
            {group.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.links.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
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
        </div>
      ))}
    </nav>
  );
}
