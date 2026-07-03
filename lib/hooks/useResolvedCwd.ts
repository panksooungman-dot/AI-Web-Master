"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore, type CurrentWorkspace } from "@/lib/store/workspace-store";
import { readSettings } from "@/lib/settings/store";
import { fetchDefaultCwd } from "@/lib/terminal/client";

interface ResolvedCwd {
  cwd: string | null;
  currentWorkspace: CurrentWorkspace | null;
  error: string | null;
}

export function useResolvedCwd(): ResolvedCwd {
  const { currentWorkspace, isHydrated } = useWorkspaceStore();
  const [cwd, setCwd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) return;

    if (currentWorkspace) {
      queueMicrotask(() => setCwd(currentWorkspace.path));
      return;
    }

    const defaultWorkspacePath = readSettings().workspace.defaultWorkspacePath.trim();
    if (defaultWorkspacePath) {
      queueMicrotask(() => setCwd(defaultWorkspacePath));
      return;
    }

    fetchDefaultCwd().then((path) => {
      if (path === null) {
        setError("작업 경로를 불러오지 못했습니다.");
        return;
      }
      setCwd(path);
    });
  }, [isHydrated, currentWorkspace]);

  return { cwd, currentWorkspace, error };
}
