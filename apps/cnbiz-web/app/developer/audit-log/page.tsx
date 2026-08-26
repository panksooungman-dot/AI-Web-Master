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
  "design.claude.generate": "Claude Design",
  "design.review.create": "Review 생성",
  "design.review.comment": "Review 댓글",
  "design.review.approve": "Review 승인",
  "design.review.reject": "Review 반려",
  "design.review.revision": "Review 수정요청",
  "design.figma.import": "Figma Import",
  "design.figma.export": "Figma Export",
  "design.sync.start": "Sync 시작",
  "design.sync.complete": "Sync 완료",
  "design.sync.rollback": "Sync 롤백",
  "design.sync.conflict": "Sync 충돌",
  "design.website.build": "Website Builder 연동",
  "deployment.github.create_repo": "GitHub 저장소 생성",
  "deployment.git.commit_push": "Git Commit/Push",
  "deployment.vercel.create_project": "Vercel Project 생성",
  "deployment.vercel.link_repo": "Vercel-GitHub 연결",
  "deployment.vercel.deploy": "Vercel 배포",
  "deployment.pipeline.success": "배포 파이프라인 성공",
  "deployment.pipeline.failed": "배포 파이프라인 실패",
  "deployment.pipeline.rollback": "배포 파이프라인 롤백",
  "workspace.autoprovision": "Project Workspace 자동 생성",
  "deployment.notify_customer": "고객 URL 전달",
  "estimate.generate": "기술 견적서 생성",
  "specification.generate": "기능 명세서 생성",
  "timeline.generate": "프로젝트 일정 생성",
  "contract.generate": "계약서 생성",
  "proposal.generate": "제안서 생성",
  "launchRequest.generate": "정보 요청서 생성",
  "inquiry.notify_admin": "의뢰 접수 알림 이메일",
  "inquiry.notify_admin_slack": "의뢰 접수 알림 Slack",
  "inquiry.notify_admin_solapi": "의뢰 접수 알림 SOLAPI",
  "customer.login": "고객 포털 로그인",
  "customer.view_document": "고객 포털 문서 조회",
  "inquiry.update": "의뢰 정보 수정",
  "inquiry.delete": "의뢰 삭제",
  "inquiry.analyze": "AI 재분석",
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
  "design.claude.generate": "purple",
  "design.review.create": "purple",
  "design.review.comment": "info",
  "design.review.approve": "success",
  "design.review.reject": "danger",
  "design.review.revision": "orange",
  "design.figma.import": "info",
  "design.figma.export": "purple",
  "design.sync.start": "info",
  "design.sync.complete": "success",
  "design.sync.rollback": "orange",
  "design.sync.conflict": "danger",
  "design.website.build": "accent",
  "deployment.github.create_repo": "info",
  "deployment.git.commit_push": "info",
  "deployment.vercel.create_project": "info",
  "deployment.vercel.link_repo": "info",
  "deployment.vercel.deploy": "accent",
  "deployment.pipeline.success": "success",
  "deployment.pipeline.failed": "danger",
  "deployment.pipeline.rollback": "orange",
  "workspace.autoprovision": "accent",
  "deployment.notify_customer": "success",
  "estimate.generate": "purple",
  "specification.generate": "purple",
  "timeline.generate": "purple",
  "contract.generate": "purple",
  "proposal.generate": "purple",
  "launchRequest.generate": "purple",
  "inquiry.notify_admin": "info",
  "inquiry.notify_admin_slack": "info",
  "inquiry.notify_admin_solapi": "info",
  "customer.login": "info",
  "customer.view_document": "neutral",
  "inquiry.update": "info",
  "inquiry.delete": "danger",
  "inquiry.analyze": "purple",
};

// ACTION_LABELS에 새 AuditAction이 추가될 때마다 이 목록을 별도로 손으로 갱신해야 했던 것이
// 여러 세션에 걸쳐 누락되어(정보 요청서·의뢰 접수 알림 이메일/Slack/SOLAPI 등 13개 액션이 필터
// 칩에 아예 없었음), 실사용에서 특정 액션으로 필터링할 방법이 없는 문제로 이어졌다. ACTION_LABELS의
// 키에서 자동으로 생성해 더 이상 두 목록이 어긋날 수 없도록 한다.
const FILTERS: ("All" | AuditAction)[] = ["All", ...(Object.keys(ACTION_LABELS) as AuditAction[])];

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
        help={[
          "서버 재시작에도 남는 영구 기록이라는 점이 Logs(임시 로그)와의 차이입니다.",
        ]}
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
            <Card key={entry.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-gray-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>

                <Badge tone={ACTION_TONES[entry.action]}>{ACTION_LABELS[entry.action]}</Badge>

                <span className="text-xs text-gray-400 truncate max-w-[12rem]">{entry.actor ?? "-"}</span>

                <Badge tone={entry.success ? "success" : "danger"}>{entry.success ? "Success" : "Failed"}</Badge>
              </div>

              <p className="text-sm text-gray-200 break-words">{entry.detail}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
