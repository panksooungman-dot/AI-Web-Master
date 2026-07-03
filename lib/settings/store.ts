export type Theme = "Light" | "Dark" | "System";
export type Shell = "PowerShell" | "CMD" | "Git Bash";

export interface Settings {
  general: {
    theme: Theme;
    language: string;
    autoSave: boolean;
  };
  terminal: {
    defaultShell: Shell;
    fontSize: number;
    workingDirectory: string;
  };
  git: {
    userName: string;
    userEmail: string;
    defaultBranch: string;
  };
  ai: {
    claudeCodePath: string;
    cursorPath: string;
    chatGptUrl: string;
  };
  workspace: {
    defaultWorkspacePath: string;
    autoOpenLastWorkspace: boolean;
  };
}

export const SETTINGS_STORAGE_KEY = "ai-web-master:settings";

export const DEFAULT_SETTINGS: Settings = {
  general: { theme: "Dark", language: "한국어", autoSave: true },
  terminal: { defaultShell: "PowerShell", fontSize: 14, workingDirectory: "D:/ai-web-master" },
  git: { userName: "", userEmail: "", defaultBranch: "main" },
  ai: { claudeCodePath: "", cursorPath: "", chatGptUrl: "https://chat.openai.com" },
  workspace: { defaultWorkspacePath: "D:/Workspace", autoOpenLastWorkspace: true },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isSettings(value: unknown): value is Settings {
  if (!isRecord(value)) return false;
  const { general, terminal, git, ai, workspace } = value;

  return (
    isRecord(general) &&
    typeof general.theme === "string" &&
    typeof general.language === "string" &&
    typeof general.autoSave === "boolean" &&
    isRecord(terminal) &&
    typeof terminal.defaultShell === "string" &&
    typeof terminal.fontSize === "number" &&
    typeof terminal.workingDirectory === "string" &&
    isRecord(git) &&
    typeof git.userName === "string" &&
    typeof git.userEmail === "string" &&
    typeof git.defaultBranch === "string" &&
    isRecord(ai) &&
    typeof ai.claudeCodePath === "string" &&
    typeof ai.cursorPath === "string" &&
    typeof ai.chatGptUrl === "string" &&
    isRecord(workspace) &&
    typeof workspace.defaultWorkspacePath === "string" &&
    typeof workspace.autoOpenLastWorkspace === "boolean"
  );
}

export function readSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed: unknown = JSON.parse(raw);
    return isSettings(parsed) ? parsed : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
