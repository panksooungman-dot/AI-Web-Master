"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import type { ProjectRecord, ProjectStatus } from "@/lib/projects/registry";
import type { WorkspaceRecord } from "@/lib/workspaces/registry";
import type { StepRunStatus, WorkflowRun } from "@/lib/workflows/types";

interface ProjectsResponse {
  projects: ProjectRecord[];
}

interface WorkspacesResponse {
  workspaces: WorkspaceRecord[];
}

interface CreateProjectResponse {
  success: boolean;
  project?: ProjectRecord;
  error?: string;
}

interface BootstrapResponse {
  success: boolean;
  run?: WorkflowRun;
  error?: string;
}

interface RunResponse {
  run?: WorkflowRun;
}

interface RunActionResponse {
  success: boolean;
  run?: WorkflowRun;
  error?: string;
}

const STATUS_TONES: Record<ProjectStatus, BadgeTone> = {
  Active: "success",
  Paused: "warning",
  Completed: "info",
  Archived: "neutral",
};

const STEP_STATUS_TONES: Record<StepRunStatus, BadgeTone> = {
  Pending: "neutral",
  Running: "info",
  Success: "success",
  Failed: "danger",
  Cancelled: "warning",
};

const STEP_LABELS: Record<string, string> = {
  "create-workspace": "Workspace 생성",
  "git-init": "Git 저장소 초기화",
  "generate-structure": "프로젝트 구조 생성",
  "generate-readme": "README.md 생성",
  "generate-package-json": "package.json 생성",
  "run-terminal": "npm install 실행",
  "git-commit": "최초 커밋",
  "git-push": "원격 저장소 Push",
  "ai-prompt": "AI 프롬프트 실행",
};

const PROJECT_TYPES = [
  "Web Application",
  "Mobile Application",
  "API / Backend",
  "Internal Tool",
  "Other",
];

const inputClass =
  "w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500";

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

  return slug || "new-project";
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [type, setType] = useState(PROJECT_TYPES[0]);
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspacePath, setNewWorkspacePath] = useState("");
  const [pathTouched, setPathTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeRun, setActiveRun] = useState<WorkflowRun | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const { selectWorkspace } = useWorkspaceStore();
  const router = useRouter();

  const loadProjects = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/projects")
      .then((res) => res.json())
      .then((data: ProjectsResponse) => setProjects(data.projects ?? []))
      .catch(() => setLoadError("Project 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  const resetForm = () => {
    setIsCreating(false);
    setName("");
    setCompany("");
    setType(PROJECT_TYPES[0]);
    setDescription("");
    setWorkspaceId("");
    setNewWorkspaceName("");
    setNewWorkspacePath("");
    setPathTouched(false);
    setError(null);
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadProjects();

      fetch("/api/workspaces")
        .then((res) => res.json())
        .then((data: WorkspacesResponse) => setWorkspaces(data.workspaces ?? []))
        .catch(() => setWorkspaces([]));
    });
  }, []);

  // Poll the active workflow run while it is still in flight.
  useEffect(() => {
    if (!activeRun) return;
    if (!["Pending", "Running", "Paused"].includes(activeRun.status)) return;

    const interval = setInterval(() => {
      fetch(`/api/workflows/runs/${activeRun.id}`)
        .then((res) => res.json())
        .then((data: RunResponse) => {
          if (data.run) setActiveRun(data.run);
        })
        .catch(() => {});
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun?.id, activeRun?.status]);

  // Once the bootstrap workflow completes, register the Project record.
  useEffect(() => {
    if (!activeRun || activeRun.status !== "Completed") return;

    const workspaceId = activeRun.context.workspaceId;
    const workspaceName = activeRun.context.workspaceName;
    const workspacePath = activeRun.context.cwd;

    if (!workspaceId || !workspaceName) {
      queueMicrotask(() => setError("Workspace 정보를 확인할 수 없습니다."));
      return;
    }

    queueMicrotask(() => setIsFinalizing(true));

    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        company,
        type,
        description,
        workspaceId,
        workspaceName,
        workspacePath,
      }),
    })
      .then((res) => res.json())
      .then((data: CreateProjectResponse) => {
        if (!data.success || !data.project) {
          setError(data.error ?? "Project 등록 실패");
          return;
        }

        setProjects((prev) => [...prev, data.project as ProjectRecord]);
        selectWorkspace({ id: workspaceId, name: workspaceName, path: workspacePath });
        setActiveRun(null);
        resetForm();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "요청 실패");
      })
      .finally(() => setIsFinalizing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun]);

  const handleWorkspaceNameChange = (value: string) => {
    setNewWorkspaceName(value);
    if (!pathTouched) {
      setNewWorkspacePath(`D:/Workspace/${slugify(value)}`);
    }
  };

  const handleCreateExisting = async () => {
    const workspace = workspaces.find((w) => w.id === workspaceId);

    if (!name.trim() || !company.trim() || !workspace || isSubmitting) {
      setError("Project Name·Company·Workspace는 필수입니다.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          type,
          description: description.trim(),
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          workspacePath: workspace.path,
        }),
      });

      const data = (await res.json()) as CreateProjectResponse;

      if (!data.success || !data.project) {
        setError(data.error ?? "Project 생성 실패");
        return;
      }

      setProjects((prev) => [...prev, data.project as ProjectRecord]);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "요청 실패";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBootstrap = async () => {
    if (
      !name.trim() ||
      !company.trim() ||
      !newWorkspaceName.trim() ||
      !newWorkspacePath.trim() ||
      isSubmitting
    ) {
      setError("Project Name·Company·Workspace Name·Path는 필수입니다.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/projects/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          workspaceName: newWorkspaceName.trim(),
          workspacePath: newWorkspacePath.trim(),
        }),
      });

      const data = (await res.json()) as BootstrapResponse;

      if (!data.success || !data.run) {
        setError(data.error ?? "워크플로 시작 실패");
        return;
      }

      setActiveRun(data.run);
      setIsCreating(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "요청 실패";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!activeRun) return;

    const res = await fetch(`/api/workflows/runs/${activeRun.id}/retry`, { method: "POST" });
    const data = (await res.json()) as RunActionResponse;

    if (data.run) setActiveRun(data.run);
  };

  const handleCancelRun = async () => {
    if (!activeRun) return;

    await fetch(`/api/workflows/runs/${activeRun.id}/cancel`, { method: "POST" });
    setActiveRun(null);
  };

  const openProject = async (project: ProjectRecord) => {
    selectWorkspace({
      id: project.workspaceId,
      name: project.workspaceName,
      path: project.workspacePath,
    });

    try {
      await fetch(`/api/projects/${project.id}`, { method: "PATCH" });
    } catch {
      // Last-opened 타임스탬프 갱신 실패는 이동을 막지 않는다.
    }

    router.push(`/projects/${project.id}`);
  };

  const hasFailedStep = activeRun?.status === "Failed";
  const completedSteps = activeRun?.steps.filter((step) => step.status === "Success").length ?? 0;
  const totalSteps = activeRun?.steps.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Development OS 위에서 실행되는 프로젝트를 관리합니다."
        actions={
          !activeRun && (
            <button
              onClick={() => (isCreating ? resetForm() : setIsCreating(true))}
              className="shrink-0 rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 font-semibold transition-colors"
            >
              {isCreating ? "Cancel" : "+ New Project"}
            </button>
          )
        }
      />

      {activeRun && (
        <Card variant="console" className="mb-6 max-w-2xl" title="New Project 진행 상황">
          <div className="mb-3 flex items-center gap-3">
            <Badge tone={activeRun.status === "Failed" ? "danger" : activeRun.status === "Completed" ? "success" : "info"}>
              {activeRun.status}
            </Badge>
            <div className="h-2 flex-1 rounded bg-gray-800">
              <div
                className="h-2 rounded bg-emerald-500 transition-all"
                style={{ width: `${totalSteps ? (completedSteps / totalSteps) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {completedSteps}/{totalSteps}
            </span>
          </div>

          <ul className="flex flex-col gap-2 font-mono text-sm">
            {activeRun.steps.map((step) => (
              <li key={step.stepId} className="rounded border border-gray-800 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span>{STEP_LABELS[step.kind] ?? step.kind}</span>
                  <div className="flex items-center gap-2">
                    {step.durationMs !== null && (
                      <span className="text-xs text-gray-500">{step.durationMs}ms</span>
                    )}
                    <Badge tone={STEP_STATUS_TONES[step.status]}>{step.status}</Badge>
                  </div>
                </div>
                {step.result?.error && (
                  <p className="mt-1 text-xs text-red-400 break-all">{step.result.error}</p>
                )}
              </li>
            ))}
          </ul>

          {isFinalizing && <LoadingText>Project Manager에 등록 중...</LoadingText>}

          <div className="mt-3 flex flex-wrap gap-2">
            {hasFailedStep && (
              <button
                onClick={handleRetry}
                className="rounded bg-yellow-600 hover:bg-yellow-700 px-3 py-1 text-sm transition-colors"
              >
                실패한 단계 재시도
              </button>
            )}
            <button
              onClick={handleCancelRun}
              className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1 text-sm transition-colors"
            >
              취소
            </button>
            {activeRun.context.workspaceId && (
              <Link
                href="/developer/terminal"
                className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm transition-colors"
              >
                Terminal에서 보기
              </Link>
            )}
          </div>
        </Card>
      )}

      {isCreating && !activeRun && (
        <Card className="mb-6 max-w-lg">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="CNBIZ Homepage"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="CNBIZ"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Project Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputClass}
              >
                {PROJECT_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="프로젝트에 대한 간단한 설명"
                className={inputClass}
              />
            </div>

            <div>
              <span className="block text-sm text-gray-400 mb-1">Workspace</span>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setMode("new")}
                  className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                    mode === "new" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
                  }`}
                >
                  새 Workspace 자동 생성
                </button>
                <button
                  type="button"
                  onClick={() => setMode("existing")}
                  className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                    mode === "existing" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
                  }`}
                >
                  기존 Workspace 사용
                </button>
              </div>

              {mode === "new" ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => handleWorkspaceNameChange(e.target.value)}
                    placeholder="New Workspace Name"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={newWorkspacePath}
                    onChange={(e) => {
                      setPathTouched(true);
                      setNewWorkspacePath(e.target.value);
                    }}
                    placeholder="D:/Workspace/new-project"
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-500">
                    Workspace 생성 → Git 초기화 → 폴더/README/package.json 생성 → npm install → 최초 커밋까지 자동 실행됩니다.
                  </p>
                </div>
              ) : workspaces.length === 0 ? (
                <p className="text-sm text-gray-500">
                  등록된 Workspace가 없습니다.{" "}
                  <Link href="/developer/workspace" className="text-blue-400 hover:underline">
                    Workspace 만들기
                  </Link>
                </p>
              ) : (
                <select
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">선택하세요</option>
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name} ({workspace.path})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {error && <StatusMessage tone="error">{error}</StatusMessage>}

            <div className="flex gap-2">
              <button
                onClick={mode === "new" ? handleBootstrap : handleCreateExisting}
                disabled={isSubmitting}
                className="rounded bg-green-600 hover:bg-green-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create"}
              </button>
              <button
                onClick={resetForm}
                className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : projects.length === 0 ? (
        <p className="text-gray-500">아직 생성된 Project가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="flex flex-col gap-2"
              actions={<Badge tone={STATUS_TONES[project.status]}>{project.status}</Badge>}
              title={project.name}
            >
              <p className="text-sm text-gray-400">{project.company}</p>
              <p className="text-xs text-gray-500">{project.type}</p>
              <p className="text-xs text-gray-500">
                Created: {new Date(project.createdAt).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                Last Opened:{" "}
                {project.lastOpenedAt
                  ? new Date(project.lastOpenedAt).toLocaleString()
                  : "-"}
              </p>
              <button
                onClick={() => openProject(project)}
                className="self-start mt-2 rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm transition-colors"
              >
                Open
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
