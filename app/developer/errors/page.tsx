"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { AuditAction, AuditEntry } from "@/lib/audit/log";

interface ErrorsResponse {
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

/**
 * 요구사항 — 중앙 Error Report 페이지. Audit Log(lib/audit/log.ts)에서 success:false인 항목만
 * 모아 보여준다 — 새 저장소를 추가하지 않고 기존 Audit Log를 그대로 재사용한다.
 */
export default function ErrorsPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/errors")
      .then((res) => res.json())
      .then((json: ErrorsResponse) => setEntries(json.entries ?? []))
      .catch(() => setLoadError("Error Report를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  return (
    <div>
      <PageHeader
        icon="🚨"
        title="Error Report"
        description="로그인·Marketplace·Website 생성·AI Task·Build 중 실패한 이력만 모아 보여줍니다(Audit Log 기반)."
        actions={
          <button
            onClick={load}
            className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
          >
            Refresh
          </button>
        }
      />

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : entries.length === 0 ? (
        <p className="text-gray-500">기록된 오류가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="flex flex-col sm:flex-row sm:items-start gap-3">
              <span className="font-mono text-xs text-gray-500 w-44 shrink-0">
                {new Date(entry.timestamp).toLocaleString()}
              </span>

              <Badge tone="danger" className="w-40 text-center shrink-0">
                {ACTION_LABELS[entry.action]}
              </Badge>

              <span className="text-xs text-gray-400 w-48 shrink-0 truncate">{entry.actor ?? "-"}</span>

              <p className="flex-1 text-sm text-red-300 break-all">{entry.detail}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
