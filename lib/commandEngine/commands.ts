import type { CommandCategory } from "./types";

export interface CommandDefinition {
  id: string;
  label: string;
  category: CommandCategory;
  command: string;
  /** true면 executeBackground()로, 아니면 execute()로 실행한다. */
  background?: boolean;
}

export const COMMAND_CATALOG: CommandDefinition[] = [
  { id: "dev:dev", label: "npm run dev", category: "development", command: "npm run dev", background: true },
  { id: "dev:build", label: "npm run build", category: "development", command: "npm run build" },
  { id: "dev:test", label: "npm test", category: "development", command: "npm test" },
  { id: "dev:lint", label: "npm run lint", category: "development", command: "npm run lint" },
  { id: "pkg:install", label: "npm install", category: "package", command: "npm install" },
  { id: "pkg:update", label: "npm update", category: "package", command: "npm update" },
  { id: "git:status", label: "git status", category: "git", command: "git status" },
  { id: "git:pull", label: "git pull", category: "git", command: "git pull" },
  { id: "git:push", label: "git push", category: "git", command: "git push" },
  { id: "util:code", label: "code .", category: "utility", command: "code ." },
  { id: "util:explorer", label: "explorer .", category: "utility", command: "explorer ." },
];

export function getCommandDefinition(id: string): CommandDefinition | undefined {
  return COMMAND_CATALOG.find((entry) => entry.id === id);
}

export function buildOpenUrlCommand(url: string): string {
  return `Start-Process '${url.replace(/'/g, "''")}'`;
}
