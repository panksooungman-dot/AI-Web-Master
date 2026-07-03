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

const STATUS_TONES: Record<ProjectStatus, BadgeTone> = {
  Active: "success",
  Paused: "warning",
  Completed: "info",
  Archived: "neutral",
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [type, setType] = useState(PROJECT_TYPES[0]);
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    queueMicrotask(() => {
      loadProjects();

      fetch("/api/workspaces")
        .then((res) => res.json())
        .then((data: WorkspacesResponse) => setWorkspaces(data.workspaces ?? []))
        .catch(() => setWorkspaces([]));
    });
  }, []);

  const resetForm = () => {
    setIsCreating(false);
    setName("");
    setCompany("");
    setType(PROJECT_TYPES[0]);
    setDescription("");
    setWorkspaceId("");
    setError(null);
  };

  const handleCreate = async () => {
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

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Development OS 위에서 실행되는 프로젝트를 관리합니다."
        actions={
          <button
            onClick={() => (isCreating ? resetForm() : setIsCreating(true))}
            className="shrink-0 rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 font-semibold transition-colors"
          >
            {isCreating ? "Cancel" : "+ New Project"}
          </button>
        }
      />

      {isCreating && (
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
              <label className="block text-sm text-gray-400 mb-1">Workspace</label>
              {workspaces.length === 0 ? (
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
                onClick={handleCreate}
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
