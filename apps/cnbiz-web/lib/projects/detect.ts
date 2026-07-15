import fs from "fs";
import path from "path";
import { executeShellCommand } from "@/lib/terminal/server";

export interface ProjectFiles {
  hasGit: boolean;
  hasPackageJson: boolean;
  hasReadme: boolean;
  framework: string | null;
  packageManager: string | null;
}

export interface ProjectHealth extends ProjectFiles {
  gitBranch: string | null;
  lastCommit: string | null;
  dirtyCount: number;
  nodeVersion: string | null;
}

const FRAMEWORK_SIGNATURES: { dependency: string; label: string }[] = [
  { dependency: "next", label: "Next.js" },
  { dependency: "nuxt", label: "Nuxt" },
  { dependency: "@remix-run/react", label: "Remix" },
  { dependency: "gatsby", label: "Gatsby" },
  { dependency: "vue", label: "Vue" },
  { dependency: "svelte", label: "Svelte" },
  { dependency: "@angular/core", label: "Angular" },
  { dependency: "express", label: "Express" },
  { dependency: "react", label: "React" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function detectFramework(packageJsonPath: string): string | null {
  try {
    const raw = fs.readFileSync(packageJsonPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    const deps: Record<string, unknown> = {
      ...(isRecord(parsed.dependencies) ? parsed.dependencies : {}),
      ...(isRecord(parsed.devDependencies) ? parsed.devDependencies : {}),
    };

    return FRAMEWORK_SIGNATURES.find((sig) => sig.dependency in deps)?.label ?? null;
  } catch {
    return null;
  }
}

function detectPackageManager(folderPath: string): string | null {
  if (fs.existsSync(path.join(folderPath, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(folderPath, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(folderPath, "bun.lockb"))) return "bun";
  if (fs.existsSync(path.join(folderPath, "package-lock.json"))) return "npm";
  return null;
}

export function detectProjectFiles(folderPath: string): ProjectFiles {
  const packageJsonPath = path.join(folderPath, "package.json");
  const hasPackageJson = fs.existsSync(packageJsonPath);

  return {
    hasGit: fs.existsSync(path.join(folderPath, ".git")),
    hasPackageJson,
    hasReadme: fs.existsSync(path.join(folderPath, "README.md")),
    framework: hasPackageJson ? detectFramework(packageJsonPath) : null,
    packageManager: detectPackageManager(folderPath),
  };
}

export async function detectProjectHealth(folderPath: string): Promise<ProjectHealth> {
  const files = detectProjectFiles(folderPath);

  const [branchResult, logResult, statusResult, nodeResult] = await Promise.all([
    files.hasGit
      ? executeShellCommand("git branch --show-current", folderPath)
      : Promise.resolve(null),
    files.hasGit
      ? executeShellCommand("git log -1 --oneline", folderPath)
      : Promise.resolve(null),
    files.hasGit
      ? executeShellCommand("git status --porcelain", folderPath)
      : Promise.resolve(null),
    executeShellCommand("node --version", folderPath),
  ]);

  return {
    ...files,
    gitBranch: branchResult?.success ? branchResult.output?.trim() || null : null,
    lastCommit: logResult?.success ? logResult.output?.trim() || null : null,
    dirtyCount: statusResult?.success
      ? statusResult.output?.split(/\r?\n/).filter((line) => line.trim()).length ?? 0
      : 0,
    nodeVersion: nodeResult.success ? nodeResult.output?.trim() || null : null,
  };
}
