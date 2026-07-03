"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import type { WorkspaceRecord } from "@/lib/workspaces/registry";

interface WorkspacesResponse {
  workspaces: WorkspaceRecord[];
}

interface CreateWorkspaceResponse {
  success: boolean;
  workspace?: WorkspaceRecord;
  error?: string;
}

const DEFAULT_BASE_PATH = "D:/Workspace";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [isPathTouched, setIsPathTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { selectWorkspace } = useWorkspaceStore();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/workspaces")
      .then((res) => res.json())
      .then((data: WorkspacesResponse) => {
        if (!cancelled) setWorkspaces(data.workspaces ?? []);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Workspace 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isPathTouched) {
      setTargetPath(value ? `${DEFAULT_BASE_PATH}/${value}` : "");
    }
  };

  const handlePathChange = (value: string) => {
    setIsPathTouched(true);
    setTargetPath(value);
  };

  const resetForm = () => {
    setIsCreating(false);
    setName("");
    setTargetPath("");
    setIsPathTouched(false);
    setError(null);
  };

  const handleCreate = async () => {
    if (!name.trim() || !targetPath.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), path: targetPath.trim() }),
      });

      const data = (await res.json()) as CreateWorkspaceResponse;

      if (!data.success || !data.workspace) {
        setError(data.error ?? "Workspace 생성 실패");
        return;
      }

      setWorkspaces((prev) => [...prev, data.workspace as WorkspaceRecord]);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "요청 실패";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWorkspace = (workspace: WorkspaceRecord) => {
    selectWorkspace({ id: workspace.id, name: workspace.name, path: workspace.path });
    router.push("/developer/terminal");
  };

  return (
    <div>
      <PageHeader
        title="Workspaces"
        description="실제 폴더 기반의 작업 공간입니다."
        actions={
          <button
            onClick={() => (isCreating ? resetForm() : setIsCreating(true))}
            className="shrink-0 rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 font-semibold transition-colors"
          >
            {isCreating ? "Cancel" : "+ New Workspace"}
          </button>
        }
      />

      {isCreating && (
        <Card className="mb-6 flex flex-col gap-3 max-w-md">
          <div>
            <label htmlFor="workspace-name" className="block text-sm text-gray-400 mb-1">
              Name
            </label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="CNBIZ"
              className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label htmlFor="workspace-path" className="block text-sm text-gray-400 mb-1">
              Path
            </label>
            <input
              id="workspace-path"
              type="text"
              value={targetPath}
              onChange={(e) => handlePathChange(e.target.value)}
              placeholder="D:/Workspace/CNBIZ"
              className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 outline-none focus:border-green-500 font-mono"
            />
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
        </Card>
      )}

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : workspaces.length === 0 ? (
        <p className="text-gray-500">아직 생성된 Workspace가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <Card key={workspace.id} className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">{workspace.name}</h2>
              <p className="text-sm text-gray-400 font-mono break-all">{workspace.path}</p>
              <p className="text-xs text-gray-500">
                Created: {new Date(workspace.createdAt).toLocaleString()}
              </p>
              <button
                onClick={() => openWorkspace(workspace)}
                className="self-start rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm transition-colors"
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
