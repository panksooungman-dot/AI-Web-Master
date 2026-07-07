"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { LivePreviewPanel } from "@/components/developer/LivePreviewPanel";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import type { ProjectRecord, ProjectStatus } from "@/lib/projects/registry";
import {
  fetchAiStatus,
  fetchGitStatus,
  fetchProjectHealth,
  type AiToolStatus,
  type ProjectGitStatus,
  type ProjectHealth,
} from "@/lib/projects/status";

interface ProjectResponse {
  project?: ProjectRecord;
  error?: string;
}

const STATUS_TONES: Record<ProjectStatus, BadgeTone> = {
  Active: "success",
  Paused: "warning",
  Completed: "info",
  Archived: "neutral",
};

export default function ProjectDashboardPage() {
  const params = useParams<{ id: string }>();
  const { selectWorkspace } = useWorkspaceStore();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [gitStatus, setGitStatus] = useState<ProjectGitStatus | null>(null);
  const [aiStatus, setAiStatus] = useState<AiToolStatus[] | null>(null);
  const [healthStatus, setHealthStatus] = useState<ProjectHealth | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/projects/${params.id}`)
      .then((res) => res.json())
      .then((data: ProjectResponse) => {
        if (cancelled) return;

        if (!data.project) {
          setLoadError(data.error ?? "프로젝트를 찾을 수 없습니다.");
          return;
        }

        setProject(data.project);
        selectWorkspace({
          id: data.project.workspaceId,
          name: data.project.workspaceName,
          path: data.project.workspacePath,
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError("프로젝트를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (!project) return;

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setIsStatusLoading(true);
    });

    Promise.all([
      fetchGitStatus(project.workspacePath),
      fetchAiStatus(),
      fetchProjectHealth(project.workspacePath),
    ]).then(([git, ai, health]) => {
      if (cancelled) return;
      setGitStatus(git);
      setAiStatus(ai);
      setHealthStatus(health);
      setIsStatusLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [project]);

  if (isLoading) {
    return <LoadingText />;
  }

  if (loadError || !project) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "프로젝트를 찾을 수 없습니다."}</StatusMessage>
        <Link href="/projects" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← Projects 목록으로
        </Link>
      </div>
    );
  }

  const recentActivity = [
    project.lastOpenedAt && {
      label: "마지막으로 열림",
      timestamp: project.lastOpenedAt,
    },
    { label: "생성됨", timestamp: project.createdAt },
  ].filter((entry): entry is { label: string; timestamp: string } => Boolean(entry));

  return (
    <div>
      <Link href="/projects" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← Projects
      </Link>

      <PageHeader
        title={project.name}
        description={`${project.company} · ${project.type}`}
        path={project.workspacePath}
        actions={
          <div className="flex items-center gap-2">
            {project.imported && <Badge tone="purple">Imported</Badge>}
            <Badge tone={STATUS_TONES[project.status]}>{project.status}</Badge>
          </div>
        }
      />

      {project.description && (
        <p className="text-sm text-gray-400 mb-6">{project.description}</p>
      )}

      <LivePreviewPanel workspacePath={project.workspacePath} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card title="Terminal">
          <Badge tone="success" className="mb-2">Ready</Badge>
          <p className="text-xs text-gray-500 font-mono break-all mb-3">
            {project.workspacePath}
          </p>
          <Link
            href="/developer/terminal"
            className="inline-block rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm transition-colors"
          >
            Open Terminal
          </Link>
        </Card>

        <Card title="Git">
          {isStatusLoading ? (
            <LoadingText>확인 중...</LoadingText>
          ) : gitStatus?.hasRepo ? (
            <>
              <Badge tone={gitStatus.dirtyCount > 0 ? "warning" : "success"} className="mb-2">
                {gitStatus.dirtyCount > 0 ? `${gitStatus.dirtyCount} changes` : "Clean"}
              </Badge>
              <p className="text-xs text-gray-500 font-mono mb-1">Branch: {gitStatus.branch}</p>
              <p className="text-xs text-gray-500 font-mono break-all mb-3">
                {gitStatus.lastCommit ?? "커밋 없음"}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-500 mb-3">Git 저장소가 아닙니다.</p>
          )}
          <Link
            href="/developer/github"
            className="inline-block rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm transition-colors"
          >
            Open GitHub
          </Link>
        </Card>

        <Card title="AI">
          {isStatusLoading ? (
            <LoadingText>확인 중...</LoadingText>
          ) : (
            <div className="flex flex-col gap-1 mb-3">
              {aiStatus?.map((tool) => (
                <p key={tool.name} className="text-xs text-gray-500 font-mono">
                  {tool.name}: {tool.installed ? tool.version ?? "설치됨" : "미설치"}
                </p>
              ))}
            </div>
          )}
          <Link
            href="/developer/ai"
            className="inline-block rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm transition-colors"
          >
            Open AI Manager
          </Link>
        </Card>

        <Card title="Health">
          {isStatusLoading ? (
            <LoadingText>확인 중...</LoadingText>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-28 shrink-0">Framework</span>
                <Badge tone={healthStatus?.framework ? "accent" : "neutral"}>
                  {healthStatus?.framework ?? "감지 안 됨"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-28 shrink-0">Node</span>
                <span className="text-xs text-gray-400 font-mono">
                  {healthStatus?.nodeVersion ?? "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-28 shrink-0">Package Manager</span>
                <span className="text-xs text-gray-400 font-mono">
                  {healthStatus?.packageManager ?? "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-28 shrink-0">README.md</span>
                <Badge tone={healthStatus?.hasReadme ? "success" : "neutral"}>
                  {healthStatus?.hasReadme ? "있음" : "없음"}
                </Badge>
              </div>
            </div>
          )}
        </Card>

        <Card title="Recent Activity">
          <ul className="flex flex-col gap-2">
            {recentActivity.map((entry) => (
              <li key={entry.label} className="text-xs text-gray-400">
                <span className="text-gray-500">{entry.label}:</span>{" "}
                {new Date(entry.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
