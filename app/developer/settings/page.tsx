"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { StatusMessage } from "@/components/developer/StatusMessage";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  isSettings,
  type Settings,
  type Shell,
} from "@/lib/settings/store";
import { runTerminalCommand } from "@/lib/terminal/client";
import type { ProviderStatus } from "@/lib/providers/status";

const ABOUT_INFO = {
  appVersion: "0.1.0",
  nodeVersion: "v24.18.0",
  nextVersion: "16.2.9",
};

function escapeForShell(value: string): string {
  return value.replace(/"/g, '`"');
}

async function syncGitConfig(git: Settings["git"]): Promise<string | null> {
  const errors: string[] = [];

  if (git.userName.trim()) {
    const result = await runTerminalCommand(
      `git config --global user.name "${escapeForShell(git.userName.trim())}"`
    );
    if (!result.success) errors.push(`user.name: ${result.error ?? "실패"}`);
  }

  if (git.userEmail.trim()) {
    const result = await runTerminalCommand(
      `git config --global user.email "${escapeForShell(git.userEmail.trim())}"`
    );
    if (!result.success) errors.push(`user.email: ${result.error ?? "실패"}`);
  }

  return errors.length > 0 ? errors.join(" / ") : null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-fit rounded border px-3 py-1 text-xs font-semibold transition-colors ${
        checked
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          : "bg-gray-500/10 text-gray-400 border-gray-500/30"
      }`}
    >
      {checked ? "On" : "Off"}
    </button>
  );
}

const inputClass =
  "w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500";

export default function SettingsManagerPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const { user, logout } = useAuth();
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderStatus[] | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isSettings(parsed)) {
            setSettings(parsed);
          }
        }
      } catch {
        // 저장된 값이 손상된 경우 기본값을 유지한다.
      }

      fetch("/api/providers")
        .then((res) => res.json())
        .then((data: { providers: ProviderStatus[] }) => setProviders(data.providers ?? []))
        .catch(() => setProviders([]));
    });
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await logout();
    router.push("/login");
  };

  const connectedProviderCount = providers?.filter((p) =>
    ["Installed", "Connected", "Configured"].includes(p.status)
  ).length;

  const updateGeneral = (patch: Partial<Settings["general"]>) => {
    setSettings((prev) => ({ ...prev, general: { ...prev.general, ...patch } }));
  };

  const updateTerminal = (patch: Partial<Settings["terminal"]>) => {
    setSettings((prev) => ({ ...prev, terminal: { ...prev.terminal, ...patch } }));
  };

  const updateGit = (patch: Partial<Settings["git"]>) => {
    setSettings((prev) => ({ ...prev, git: { ...prev.git, ...patch } }));
  };

  const updateAi = (patch: Partial<Settings["ai"]>) => {
    setSettings((prev) => ({ ...prev, ai: { ...prev.ai, ...patch } }));
  };

  const updateWorkspace = (patch: Partial<Settings["workspace"]>) => {
    setSettings((prev) => ({ ...prev, workspace: { ...prev.workspace, ...patch } }));
  };

  const persist = (next: Settings) => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  };

  const handleSave = async () => {
    persist(settings);
    setIsSyncing(true);
    try {
      const gitError = await syncGitConfig(settings.git);
      setStatusTone(gitError ? "error" : "success");
      setStatusMessage(
        gitError
          ? `저장되었습니다. (Git 설정 동기화 실패: ${gitError})`
          : `저장되었습니다. (${new Date().toLocaleTimeString()})`
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    persist(DEFAULT_SETTINGS);
    setStatusTone("success");
    setStatusMessage(`기본값으로 초기화되었습니다. (${new Date().toLocaleTimeString()})`);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "settings.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatusTone("success");
    setStatusMessage(`설정을 내보냈습니다. (${new Date().toLocaleTimeString()})`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch {
        setStatusTone("error");
        setStatusMessage("가져오기 실패: JSON 파싱 오류입니다.");
        return;
      }

      if (!isSettings(parsed)) {
        setStatusTone("error");
        setStatusMessage("가져오기 실패: 올바르지 않은 설정 파일입니다.");
        return;
      }

      setSettings(parsed);
      persist(parsed);

      setIsSyncing(true);
      try {
        const gitError = await syncGitConfig(parsed.git);
        setStatusTone(gitError ? "error" : "success");
        setStatusMessage(
          gitError
            ? `설정을 가져왔습니다. (Git 설정 동기화 실패: ${gitError})`
            : `설정을 가져왔습니다. (${new Date().toLocaleTimeString()})`
        );
      } finally {
        setIsSyncing(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <PageHeader
        icon="⚙️"
        title="Settings Manager"
        description="Development OS의 모든 환경설정을 관리합니다."
        actions={
          <>
            <button
              onClick={handleSave}
              disabled={isSyncing}
              className="rounded bg-green-600 hover:bg-green-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {isSyncing ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleReset}
              className="rounded bg-red-600/80 hover:bg-red-700 px-4 py-2 text-sm transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleExport}
              className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm transition-colors"
            >
              Export Settings
            </button>
            <button
              onClick={handleImportClick}
              className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
            >
              Import Settings
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </>
        }
      />

      {statusMessage && (
        <StatusMessage tone={statusTone} className="mb-6">
          {statusMessage}
        </StatusMessage>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Profile">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-200">{user?.email ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">User ID</span>
              <span className="font-mono text-xs text-gray-400">{user?.id ?? "-"}</span>
            </div>
          </div>
        </Card>

        <Card title="Authentication">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-500">Session</span>
              <Badge tone={user ? "success" : "neutral"}>{user ? "Active" : "None"}</Badge>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="self-start rounded bg-red-900/60 hover:bg-red-800 px-4 py-2 text-sm text-red-200 transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
            </button>
          </div>
        </Card>

        <Card title="General">
          <div className="flex flex-col gap-4">
            <Field label="Theme">
              <div className="flex gap-2">
                {(["Light", "Dark", "System"] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateGeneral({ theme })}
                    className={`rounded border px-3 py-1 text-sm transition-colors ${
                      settings.general.theme === theme
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Language">
              <select
                value={settings.general.language}
                onChange={(e) => updateGeneral({ language: e.target.value })}
                className={inputClass}
              >
                <option value="한국어">한국어</option>
                <option value="English">English</option>
              </select>
            </Field>

            <Field label="Auto Save">
              <Toggle
                checked={settings.general.autoSave}
                onChange={(value) => updateGeneral({ autoSave: value })}
              />
            </Field>
          </div>
        </Card>

        <Card title="Terminal">
          <div className="flex flex-col gap-4">
            <Field label="Default Shell">
              <select
                value={settings.terminal.defaultShell}
                onChange={(e) => updateTerminal({ defaultShell: e.target.value as Shell })}
                className={inputClass}
              >
                <option value="PowerShell">PowerShell</option>
                <option value="CMD">CMD</option>
                <option value="Git Bash">Git Bash</option>
              </select>
            </Field>

            <Field label="Font Size">
              <input
                type="number"
                min={10}
                max={24}
                value={settings.terminal.fontSize}
                onChange={(e) => updateTerminal({ fontSize: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>

            <Field label="Working Directory">
              <input
                type="text"
                value={settings.terminal.workingDirectory}
                onChange={(e) => updateTerminal({ workingDirectory: e.target.value })}
                className={`${inputClass} font-mono`}
              />
            </Field>
          </div>
        </Card>

        <Card title="Git">
          <div className="flex flex-col gap-4">
            <Field label="User Name">
              <input
                type="text"
                value={settings.git.userName}
                onChange={(e) => updateGit({ userName: e.target.value })}
                placeholder="panksooungman-dot"
                className={inputClass}
              />
            </Field>

            <Field label="User Email">
              <input
                type="email"
                value={settings.git.userEmail}
                onChange={(e) => updateGit({ userEmail: e.target.value })}
                placeholder="you@example.com"
                className={inputClass}
              />
            </Field>

            <Field label="Default Branch">
              <input
                type="text"
                value={settings.git.defaultBranch}
                onChange={(e) => updateGit({ defaultBranch: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        <Card title="AI Providers">
          <div className="mb-4 flex items-center justify-between gap-3 rounded border border-gray-800 p-3 text-sm">
            <span className="text-gray-400">
              연결된 Provider: {connectedProviderCount ?? "확인 중..."}
              {providers && ` / ${providers.length}`}
            </span>
            <Link href="/developer/ai" className="text-blue-400 hover:underline">
              AI Workspace에서 자세히 보기 →
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            <Field label="Claude Code Path">
              <input
                type="text"
                value={settings.ai.claudeCodePath}
                onChange={(e) => updateAi({ claudeCodePath: e.target.value })}
                placeholder="C:/Program Files/Claude Code/claude.exe"
                className={`${inputClass} font-mono`}
              />
            </Field>

            <Field label="Cursor Path">
              <input
                type="text"
                value={settings.ai.cursorPath}
                onChange={(e) => updateAi({ cursorPath: e.target.value })}
                placeholder="C:/Users/.../AppData/Local/Programs/cursor/Cursor.exe"
                className={`${inputClass} font-mono`}
              />
            </Field>

            <Field label="ChatGPT URL">
              <input
                type="url"
                value={settings.ai.chatGptUrl}
                onChange={(e) => updateAi({ chatGptUrl: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        <Card title="Workspace">
          <div className="flex flex-col gap-4">
            <Field label="Default Workspace Path">
              <input
                type="text"
                value={settings.workspace.defaultWorkspacePath}
                onChange={(e) => updateWorkspace({ defaultWorkspacePath: e.target.value })}
                className={`${inputClass} font-mono`}
              />
            </Field>

            <Field label="Auto Open Last Workspace">
              <Toggle
                checked={settings.workspace.autoOpenLastWorkspace}
                onChange={(value) => updateWorkspace({ autoOpenLastWorkspace: value })}
              />
            </Field>
          </div>
        </Card>

        <Card title="About">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">App Version</span>
              <span className="font-mono">{ABOUT_INFO.appVersion}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Node Version</span>
              <span className="font-mono">{ABOUT_INFO.nodeVersion}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Next.js Version</span>
              <span className="font-mono">{ABOUT_INFO.nextVersion}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
