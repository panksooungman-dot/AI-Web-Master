"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface CurrentWorkspace {
  id: string;
  name: string;
  path: string;
}

interface WorkspaceStoreValue {
  currentWorkspace: CurrentWorkspace | null;
  isHydrated: boolean;
  selectWorkspace: (workspace: CurrentWorkspace) => void;
  clearWorkspace: () => void;
}

const STORAGE_KEY = "ai-web-master:current-workspace";

const WorkspaceStoreContext = createContext<WorkspaceStoreValue | null>(null);

function isCurrentWorkspace(value: unknown): value is CurrentWorkspace {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.path === "string"
  );
}

export function WorkspaceStoreProvider({ children }: { children: ReactNode }) {
  const [currentWorkspace, setCurrentWorkspace] = useState<CurrentWorkspace | null>(
    null
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isCurrentWorkspace(parsed)) {
            setCurrentWorkspace(parsed);
          }
        }
      } catch {
        // 저장된 값이 손상된 경우 무시하고 초기 상태를 유지한다.
      } finally {
        setIsHydrated(true);
      }
    });
  }, []);

  const selectWorkspace = useCallback((workspace: CurrentWorkspace) => {
    setCurrentWorkspace(workspace);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, []);

  const clearWorkspace = useCallback(() => {
    setCurrentWorkspace(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <WorkspaceStoreContext.Provider
      value={{ currentWorkspace, isHydrated, selectWorkspace, clearWorkspace }}
    >
      {children}
    </WorkspaceStoreContext.Provider>
  );
}

export function useWorkspaceStore(): WorkspaceStoreValue {
  const context = useContext(WorkspaceStoreContext);

  if (!context) {
    throw new Error("useWorkspaceStore must be used within a WorkspaceStoreProvider");
  }

  return context;
}
