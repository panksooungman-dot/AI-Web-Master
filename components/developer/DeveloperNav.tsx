"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/developer/workspace", label: "Workspace" },
  { href: "/developer/terminal", label: "Terminal" },
  { href: "/developer/github", label: "GitHub" },
  { href: "/developer/ai", label: "AI" },
  { href: "/developer/logs", label: "Logs" },
  { href: "/developer/settings", label: "Settings" },
];

export function DeveloperNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 mb-6 border-b border-gray-800 pb-4">
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
