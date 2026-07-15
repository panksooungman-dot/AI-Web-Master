"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { componentMarker } from "@/lib/dev/component-marker";

const TABS = [
  { href: "/developer/marketplace", label: "Browse" },
  { href: "/developer/marketplace/installed", label: "Installed" },
  { href: "/developer/marketplace/updates", label: "Updates" },
];

export function MarketplaceTabs() {
  const pathname = usePathname();

  return (
    <div
      className="mb-6 flex gap-2 border-b border-gray-800 pb-3"
      {...componentMarker("MarketplaceTabs", "components/developer/marketplace/MarketplaceTabs.tsx")}
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
              isActive ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
