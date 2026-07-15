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

    // Settings > Workspace의 "Default Workspace Path"는 새 Workspace 생성 시
    // 제안하는 상위 폴더일 뿐(app/developer/workspace의 새 Workspace 폼과는 별개
    // 필드), 실제로 존재·실행 가능한 프로젝트 경로라는 보장이 없다. 현재
    // Workspace가 선택되지 않았을 때는, 이 Next.js 서버가 실제로 실행 중인
    // 현재 프로젝트 경로(process.cwd())를 우선 사용해야 Terminal·Dev Server 등
    // 모든 API가 항상 유효한 프로젝트를 대상으로 동작한다.
    fetchDefaultCwd().then((path) => {
      if (path !== null) {
        setCwd(path);
        return;
      }

      const defaultWorkspacePath = readSettings().workspace.defaultWorkspacePath.trim();
      if (defaultWorkspacePath) {
        setCwd(defaultWorkspacePath);
        return;
      }

      setError("작업 경로를 불러오지 못했습니다.");
    });
  }, [isHydrated, currentWorkspace]);

  return { cwd, currentWorkspace, error };
}
