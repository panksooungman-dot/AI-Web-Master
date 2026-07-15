"use client";

import { useEffect, useState } from "react";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { AuditAction, AuditEntry } from "@/lib/audit/log";

interface AuditResponse {
  entries: AuditEntry[];
}

const ACTION_LABELS: Record<AuditAction, string> = {
  "auth.login": "로그인",
  "auth.logout": "로그아웃",
  "marketplace.publish": "Marketplace Publish",
  "marketplace.install": "Marketplace Install",
  "marketplace.remove": "Marketplace Remove",
  "website.generate": "Website Generation",
  "ai.task": "AI Task",
  "build.run": "Build",
  "design.generate": "Design Plan",
  "design.storyboard.generate": "Storyboard",
  "design.wireframe.generate": "Wireframe",
  "design.prototype.generate": "Prototype",
};

const ACTION_TONES: Record<AuditAction, BadgeTone> = {
  "auth.login": "info",
  "auth.logout": "neutral",
  "marketplace.publish": "purple",
  "marketplace.install": "purple",
  "marketplace.remove": "orange",
  "website.generate": "accent",
  "ai.task": "accent",
  "build.run": "neutral",
  "design.generate": "purple",
  "design.storyboard.generate": "purple",
  "design.wireframe.generate": "purple",
  "design.prototype.generate": "purple",
};

const FILTERS: ("All" | AuditAction)[] = [
  "All",
  "auth.login",
  "auth.logout",
  "marketplace.publish",
  "marketplace.install",
  "marketplace.remove",
  "website.generate",
  "ai.task",
  "build.run",
  "design.generate",
  "design.storyboard.generate",
  "design.wireframe.generate",
  "design.prototype.generate",
];

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | AuditAction>("All");

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/audit")
      .then((res) => res.json())
      .then((json: AuditResponse) => setEntries(json.entries ?? []))
      .catch(() => setLoadError("Audit Log를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const filteredEntries = filter === "All" ? entries : entries.filter((entry) => entry.action === filter);

  return (
    <div>
      <PageHeader
        icon="🧾"
        title="Audit Log"
        description="로그인·로그아웃·Marketplace publish/install/remove·Website 생성·AI Task 실행 이력을 기록합니다."
        actions={
          <button
            onClick={load}
            className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
          >
            Refresh
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`rounded-full border px-4 py-1 text-sm font-semibold transition-colors ${
              filter === option
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            {option === "All" ? "All" : ACTION_LABELS[option]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : filteredEntries.length === 0 ? (
        <p className="text-gray-500">기록된 항목이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="font-mono text-xs text-gray-500 w-44 shrink-0">
                {new Date(entry.timestamp).toLocaleString()}
              </span>

              <Badge tone={ACTION_TONES[entry.action]} className="w-40 text-center">
                {ACTION_LABELS[entry.action]}
              </Badge>

              <span className="text-xs text-gray-400 w-48 shrink-0 truncate">{entry.actor ?? "-"}</span>

              <p className="flex-1 text-sm text-gray-200 break-all">{entry.detail}</p>

              <Badge tone={entry.success ? "success" : "danger"}>{entry.success ? "Success" : "Failed"}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
