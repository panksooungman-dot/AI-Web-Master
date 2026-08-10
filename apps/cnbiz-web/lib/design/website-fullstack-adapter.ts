import fs from "fs/promises";
import path from "path";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { getLatestDatabaseCodeForPlan } from "./database-code";
import { getLatestBackendCodeForPlan } from "./backend-code";
import { getLatestApiCodeForPlan, type PackageRequirements } from "./api-code";
import { getLatestTestCodeForPlan } from "./test-code";
import { getLatestCrudFrontendForPlan } from "./crud-frontend";

/**
 * Chain A ↔ Chain B 연결점. 이 저장소의 Design Automation은 서로 다른 식별자로 이어지는 두
 * 개의 독립된 체인으로 나뉘어 있다:
 *
 * - Chain A(Review 기반): Design Plan → Storyboard → Wireframe → Prototype → Claude Design →
 *   Review → **Website Build**(`POST /api/design/website`, React Generator로 프론트엔드
 *   페이지 생성) → Deployment. reviewId로 이어진다.
 * - Chain B(Plan 기반): Design Plan → Database Design → API Design → Backend Design →
 *   {Backend Code, API Code, Database Code, Test Plan → Test Code, **CRUD Frontend**}.
 *   planId로 이어진다. CRUD Frontend(lib/design/crud-frontend.ts)는 Chain A의 Wireframe이
 *   추상적 컴포넌트만 알고 어느 리소스의 데이터인지 모르는 것과 달리, API Code(lib/api-client.ts의
 *   실제 함수)와 Database Design(컬럼 정보)만으로 리소스마다 실제로 백엔드를 호출하는 목록·등록·
 *   수정 화면을 생성한다 — Chain A 없이도 Chain B 단독으로 완결된, 실제 동작하는 다중 페이지
 *   CRUD 앱이 나온다(상가 관리·재고 관리 같은 데이터 중심 앱에 적합, 마케팅 페이지는 Chain A가
 *   여전히 담당).
 *
 * 두 체인은 시작점(Design Plan)만 같을 뿐 서로를 참조하지 않는다 — Chain A의 Website Build는
 * 지금까지 프론트엔드 페이지만 생성하고 Chain B의 실제 실행 가능한 산출물(SQL 마이그레이션·
 * Route Handler·서비스 함수·테스트·CRUD 화면)은 전혀 반영하지 않았다. 이 모듈이 그 간극을 메운다
 * — Website Build가 성공한 뒤, 같은 planId로 생성된 Chain B의 최신 산출물을 찾아 같은 프로젝트
 * 디렉터리에 실제 파일로 써넣는다.
 *
 * Chain B의 각 단계는 독립적으로 생성되므로(사용자가 어떤 단계까지 만들었는지 알 수 없음) 없는
 * 단계는 조용히 건너뛴다 — Website Build 자체를 실패시키지 않는다(Hybrid Adapter가 Prototype
 * 체인이 없을 때 뼈대 DesignDocument로 폴백하는 것과 동일한 원칙).
 */

export interface FullStackCodeSummary {
  databaseCodeId: string | null;
  backendCodeId: string | null;
  apiCodeId: string | null;
  testCodeId: string | null;
  crudFrontendId: string | null;
  /** 실제로 써넣은 파일 경로(프로젝트 루트 기준 상대 경로), 순서 보존. */
  filesWritten: string[];
  /** package.json에 실제로 병합한 dependency/devDependency/script 이름 목록(추적용). */
  packageChanges: string[];
}

/**
 * 여러 Phase가 요구하는 package.json 변경사항(dependencies/devDependencies/scripts)을
 * `outDir/package.json`에 병합한다. 예: API Code는 `@supabase/supabase-js`를, Test Code는
 * `vitest`+`test` 스크립트를 요구한다 — 이 병합이 없으면 생성된 파일들이 import하는
 * 패키지가 프로젝트에 존재하지 않아 설치·빌드 단계에서 실패한다. package.json이 없으면(있어야
 * 정상이지만) 아무 것도 하지 않고 빈 배열을 반환한다 — Website Build 자체를 실패시키지 않는다.
 */
async function mergePackageRequirements(outDir: string, requirements: PackageRequirements[]): Promise<string[]> {
  const packageJsonPath = path.join(outDir, "package.json");
  let pkg: Record<string, unknown>;

  try {
    pkg = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
  } catch {
    return [];
  }

  const changed: string[] = [];
  const dependencies = { ...(pkg.dependencies as Record<string, string> | undefined) };
  const devDependencies = { ...(pkg.devDependencies as Record<string, string> | undefined) };
  const scripts = { ...(pkg.scripts as Record<string, string> | undefined) };

  for (const req of requirements) {
    for (const [name, version] of Object.entries(req.dependencies ?? {})) {
      if (dependencies[name] !== version) {
        dependencies[name] = version;
        changed.push(`dependencies.${name}`);
      }
    }
    for (const [name, version] of Object.entries(req.devDependencies ?? {})) {
      if (devDependencies[name] !== version) {
        devDependencies[name] = version;
        changed.push(`devDependencies.${name}`);
      }
    }
    for (const [name, command] of Object.entries(req.scripts ?? {})) {
      if (scripts[name] !== command) {
        scripts[name] = command;
        changed.push(`scripts.${name}`);
      }
    }
  }

  if (changed.length > 0) {
    const merged = { ...pkg, dependencies, devDependencies, scripts };
    await fs.writeFile(packageJsonPath, `${JSON.stringify(merged, null, 2)}\n`, "utf-8");
  }

  return changed;
}

/**
 * planId로 Chain B의 최신 산출물(Database/Backend/API/Test Code)을 조회해 `outDir`(Website
 * Build가 만든 프로젝트 디렉터리)에 실제 파일로 쓰고, 그 산출물들이 요구하는 패키지 의존성을
 * package.json에 병합한다. 넷 다 없으면 아무 것도 쓰지 않고 모든 필드가 null/빈 배열인 요약을
 * 반환한다(에러 아님).
 */
export async function applyFullStackCode(
  outDir: string,
  planId: string,
  store: CollectionStore = getDefaultStore()
): Promise<FullStackCodeSummary> {
  const [databaseCode, backendCode, apiCode, testCode, crudFrontend] = await Promise.all([
    getLatestDatabaseCodeForPlan(planId, store),
    getLatestBackendCodeForPlan(planId, store),
    getLatestApiCodeForPlan(planId, store),
    getLatestTestCodeForPlan(planId, store),
    getLatestCrudFrontendForPlan(planId, store),
  ]);

  const files = [
    ...(databaseCode?.content.files ?? []),
    ...(backendCode?.content.files ?? []),
    ...(apiCode?.content.files ?? []),
    ...(testCode?.content.files ?? []),
    ...(crudFrontend?.content.files ?? []),
  ];

  const filesWritten: string[] = [];
  for (const file of files) {
    const absolute = path.join(outDir, file.path);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, file.code, "utf-8");
    filesWritten.push(file.path);
  }

  const requirements = [apiCode?.content.packageRequirements, testCode?.content.packageRequirements].filter(
    (req): req is PackageRequirements => Boolean(req)
  );
  const packageChanges = requirements.length > 0 ? await mergePackageRequirements(outDir, requirements) : [];

  return {
    databaseCodeId: databaseCode?.id ?? null,
    backendCodeId: backendCode?.id ?? null,
    apiCodeId: apiCode?.id ?? null,
    testCodeId: testCode?.id ?? null,
    crudFrontendId: crudFrontend?.id ?? null,
    filesWritten,
    packageChanges,
  };
}
