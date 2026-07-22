"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { componentMarker } from "@/lib/dev/component-marker";
import { useAuth } from "@/lib/auth/AuthContext";
import { roleCanAccessArea } from "@/lib/auth/rbac";

const NAV_LINKS = [
  { href: "/developer", label: "Dashboard" },
  { href: "/developer/analysis", label: "Analysis" },
  { href: "/developer/planning", label: "Planning" },
  { href: "/projects", label: "프로젝트 관리" },
  { href: "/developer/requests", label: "의뢰 관리" },
  { href: "/developer/inquiries", label: "AI 의뢰 관리" },
  { href: "/developer/clients", label: "고객사 관리" },
  { href: "/developer/workspace", label: "Workspace" },
  { href: "/developer/terminal", label: "Terminal" },
  { href: "/developer/github", label: "GitHub" },
  { href: "/developer/ai", label: "AI Workspace" },
  { href: "/developer/prompts", label: "Prompt Library" },
  { href: "/developer/workflows", label: "Workflow Center" },
  { href: "/developer/design", label: "Design" },
  { href: "/developer/websites", label: "Website Builder" },
  { href: "/developer/marketplace", label: "Marketplace" },
  { href: "/developer/logs", label: "Logs" },
  { href: "/developer/health", label: "Health" },
  { href: "/developer/audit-log", label: "Audit Log" },
  { href: "/developer/metrics", label: "Metrics" },
  { href: "/developer/backup", label: "Backup" },
  { href: "/developer/errors", label: "Error Report" },
  { href: "/developer/deployment", label: "Deployment" },
  { href: "/developer/settings", label: "Settings" },
  { href: "/developer/ui-map", label: "UI Explorer" },
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
      className="flex flex-wrap gap-2 mb-6 border-b border-gray-800 pb-4"
      {...componentMarker("DeveloperNav", "components/developer/DeveloperNav.tsx")}
    >
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
