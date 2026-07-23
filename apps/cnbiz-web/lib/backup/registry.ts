import fs from "fs";
import os from "os";
import path from "path";

/**
 * 요구사항 — Backup: Export configuration/prompts/workflows + Import 지원.
 * 각 섹션을 소유한 모듈(packages/cli의 ProviderManager, lib/prompts/registry.ts,
 * lib/workflows/registry.ts)의 내부 로직을 다시 구현하지 않고, 그 모듈들이 실제로 읽고 쓰는
 * 고정된 JSON 파일 경로를 그대로 읽고 쓴다(lib/marketplace/registry.ts의 getCatalogSummary()가
 * marketplace/manifest.json을 직접 읽는 것과 동일한 원칙 — 파일 자체가 안정적인 계약이다).
 * "configuration"은 `.runtime/config/providers.json`을 의미한다 — 실제 비밀값이 아니라
 * `${ENV_VAR}` 참조 템플릿만 담고 있어(packages/cli/src/providers/manager.ts 참고) 내보내도 안전하다.
 *
 * prompts/workflows는 이제 CollectionStore(`lib/prompts/registry.ts`·`lib/workflows/registry.ts`,
 * Supabase 프로덕션 / fs 로컬 폴백)로 관리된다 — 로컬 fs 폴백의 실제 기본 경로는
 * `lib/db/fsStore.ts`의 DEFAULT_BASE_DIR(os.tmpdir()/cnbiz-web/data)이며 `cwd/lib/data`가 아니다
 * (2026-07-16 커밋 0954f09로 변경됨). 이 파일은 그 기본 경로가 바뀌었을 때 함께 갱신되지 않아
 * 로컬 개발에서도 매번 빈 배열만 내보내고 있었다 — Supabase가 store로 선택되는 프로덕션에서는
 * 애초에 이 경로에 파일 자체가 없으므로(Export가 항상 빈 배열, Import가 아무도 읽지 않는 파일에
 * 쓰기만 함) 여전히 공백으로 남는다(별도 후속 작업 필요, 이번엔 fsStore 기본 경로와의 불일치만
 * 수정했다).
 */
export interface BackupBundle {
  version: 1;
  exportedAt: string;
  configuration: Record<string, unknown> | null;
  prompts: unknown[];
  workflows: unknown[];
}

function configPath(cwd: string): string {
  return path.join(cwd, ".runtime", "config", "providers.json");
}

/** lib/db/fsStore.ts의 DEFAULT_BASE_DIR과 반드시 일치해야 한다. */
const DEFAULT_FS_STORE_DATA_DIR = path.join(os.tmpdir(), "cnbiz-web", "data");

function promptsPath(dataDir: string): string {
  return path.join(dataDir, "prompts.json");
}

function workflowsPath(dataDir: string): string {
  return path.join(dataDir, "workflows.json");
}

function readJsonSafe(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return undefined;
  }
}

export function exportBackup(
  cwd: string = process.cwd(),
  fsStoreDataDir: string = DEFAULT_FS_STORE_DATA_DIR
): BackupBundle {
  const configuration = readJsonSafe(configPath(cwd));
  const prompts = readJsonSafe(promptsPath(fsStoreDataDir));
  const workflows = readJsonSafe(workflowsPath(fsStoreDataDir));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    configuration: (configuration as Record<string, unknown> | undefined) ?? null,
    prompts: Array.isArray(prompts) ? prompts : [],
    workflows: Array.isArray(workflows) ? workflows : [],
  };
}

export interface ImportResult {
  success: boolean;
  imported: {
    configuration: boolean;
    prompts: number;
    workflows: number;
  };
  error?: string;
}

function isBackupBundle(value: unknown): value is Partial<BackupBundle> {
  return typeof value === "object" && value !== null;
}

/**
 * 번들에 있는 섹션만 복원한다(부분 번들 허용) — 없는 섹션은 건드리지 않는다.
 * 기존 파일을 완전히 교체(overwrite)한다 — merge가 아니다, 복원(restore) 의미론이기 때문.
 */
export function importBackup(
  bundle: unknown,
  cwd: string = process.cwd(),
  fsStoreDataDir: string = DEFAULT_FS_STORE_DATA_DIR
): ImportResult {
  if (!isBackupBundle(bundle)) {
    return {
      success: false,
      imported: { configuration: false, prompts: 0, workflows: 0 },
      error: "올바른 backup 파일이 아닙니다.",
    };
  }

  const imported = { configuration: false, prompts: 0, workflows: 0 };

  try {
    if (bundle.configuration && typeof bundle.configuration === "object") {
      const file = configPath(cwd);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(bundle.configuration, null, 2), "utf-8");
      imported.configuration = true;
    }

    if (Array.isArray(bundle.prompts)) {
      const file = promptsPath(fsStoreDataDir);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(bundle.prompts, null, 2), "utf-8");
      imported.prompts = bundle.prompts.length;
    }

    if (Array.isArray(bundle.workflows)) {
      const file = workflowsPath(fsStoreDataDir);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(bundle.workflows, null, 2), "utf-8");
      imported.workflows = bundle.workflows.length;
    }

    return { success: true, imported };
  } catch (error) {
    return {
      success: false,
      imported,
      error: error instanceof Error ? error.message : "Import 중 오류가 발생했습니다.",
    };
  }
}
