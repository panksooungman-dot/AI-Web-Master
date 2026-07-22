import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { execute } from "@/lib/commandEngine/engine";
import { getDesignPlan } from "@/lib/design/registry";
import { getReview } from "@/lib/design/review-registry";
import { getClaudeDesign } from "@/lib/design/claude-design";
import { getPrototype } from "@/lib/design/prototype";
import { buildWebsiteBuildHybridSource } from "@/lib/design/website-build-document-adapter";
import { listWebsiteBuilds, recordWebsiteBuild, type WebsiteBuildRecord } from "@/lib/design/website-build";
import { createWebsiteRecord } from "@/lib/websites/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";
import { resolveRepoRoot } from "@/lib/paths/repoRoot";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

  return slug || "website";
}

function toResponse(record: WebsiteBuildRecord) {
  return {
    success: true,
    buildId: record.id,
    projectId: record.planId,
    reviewId: record.reviewId,
    websiteId: record.websiteId,
    siteType: record.siteType,
    status: record.status,
    simulatedContent: record.simulatedContent,
    version: record.version,
    build: record,
  };
}

export async function GET() {
  return NextResponse.json({ builds: listWebsiteBuilds() });
}

/**
 * `POST /api/design/website` — Design Automation Phase 9(`DESIGN_AUTOMATION_MASTER.md`의 자체
 * Phase 번호 — Figma/Design Sync 다음 단계인 "Website Build 연동"을 가리키며, 아래 설명하는
 * Design JSON Standardization의 "Phase 9"(docs/architecture/DESIGN_JSON_MIGRATION_STATUS.md,
 * Website Builder Integration)와는 별개의 번호 체계다). 새로운 생성 엔진을 만들지 않고 기존
 * Website Builder v2를 그대로 재사용한다 — 이 라우트가 조립하는 실행 경로는
 * `app/api/websites/route.ts`(Dashboard의 Website Builder 페이지)와 완전히 동일한
 * `node packages/cli/dist/index.js website create ...` child process 호출이다.
 *
 * [Design JSON Standardization Phase 9] 입력 조립은 이제 `website-build-adapter.ts`의
 * `planToWebsiteBuildInputs()`를 직접 호출하지 않고, Phase 7의 Hybrid Adapter
 * (`website-build-document-adapter.ts`의 `buildWebsiteBuildHybridSource()`)를 통해서만
 * 이뤄진다 — 그 Adapter 내부가 여전히 `planToWebsiteBuildInputs()`를 그대로 위임 호출하므로
 * `inputs`의 실제 값·CLI 실행 결과는 이전과 100% 동일하다(호출 경로만 단일화, 로직 중복 제거).
 * Review에 연결된 ClaudeDesign→Prototype 체인이 있으면(Phase 6) `buildWebsiteBuildHybridSource()`가
 * sections/theme까지 채워진 풍부한 DesignDocument를 반환하고, 체인이 아직 없으면 Phase 1 뼈대
 * DesignDocument로 자동 폴백한다(Adapter 자체 규칙, 이 라우트는 그 폴백을 신경 쓰지 않는다).
 * `packages/cli`의 실제 웹사이트 생성 로직은 여전히 `inputs`(businessType/audience/brand/
 * language/siteType)만 소비한다 — DesignDocument의 pages/sections/components/theme을 실제
 * 생성에 반영하는 것은 이번 Phase의 범위 밖이다(Remaining Work 참고). `document.pages.length`는
 * 감사 로그에만 참고 정보로 기록해 Hybrid Source가 실제로 사용되었음을 추적 가능하게 한다 —
 * API 응답(JSON) 필드는 하나도 바뀌지 않았다.
 *
 * Approval Rule(Figma Export와 동일한 원칙) — Review 상태가 "approved"가 아니면 409를 반환한다.
 * 실제 코드를 생성하는 마지막 단계이므로, 참고 자료 성격인 Figma Import보다는 Figma Export/
 * Design Sync와 같은 게이트를 적용하는 것이 맞다고 판단했다.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const reviewId = isRecord(body) && typeof body.reviewId === "string" ? body.reviewId.trim() : "";
  const outDirInput = isRecord(body) && typeof body.outDir === "string" ? body.outDir.trim() : "";

  if (!reviewId) {
    return NextResponse.json({ success: false, error: "reviewId는 필수입니다." }, { status: 400 });
  }

  const review = await getReview(reviewId);
  if (!review) {
    return NextResponse.json({ success: false, error: `Review "${reviewId}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  if (review.status !== "approved") {
    return NextResponse.json(
      {
        success: false,
        error: `Review "${reviewId}"는 아직 승인되지 않았습니다(현재 상태: "${review.status}"). Website Builder 연동은 Approved 상태에서만 가능합니다.`,
      },
      { status: 409 }
    );
  }

  const plan = await getDesignPlan(review.planId);
  if (!plan) {
    return NextResponse.json(
      { success: false, error: `Design Plan "${review.planId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  // Review는 항상 ClaudeDesign을 가리키지만(필수 필드), 그 체인이 아직 존재하지 않는 경우까지
  // 방어적으로 처리한다 — 없으면 Hybrid Adapter가 Phase 1 뼈대 DesignDocument로 자동 폴백한다.
  const claudeDesign = await getClaudeDesign(review.claudeDesignId);
  const prototype = claudeDesign ? await getPrototype(claudeDesign.prototypeId) : null;

  const repoRoot = resolveRepoRoot();
  const cliEntry = path.join(repoRoot, "packages", "cli", "dist", "index.js");

  if (!fs.existsSync(cliEntry)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "packages/cli가 아직 빌드되지 않았습니다. `npm run build --workspace=@ai-business-os/cli`를 먼저 실행하세요.",
      },
      { status: 400 }
    );
  }

  const hybridSource = buildWebsiteBuildHybridSource(plan, prototype);
  const inputs = hybridSource.inputs;
  const slug = slugify(inputs.name);
  const outDir = outDirInput || path.join(repoRoot, ".generated-websites", `design-${slug}`);

  const args = [
    `"${cliEntry}"`,
    "website",
    "create",
    `--name "${inputs.name}"`,
    `--type "${inputs.businessType}"`,
    `--audience "${inputs.audience}"`,
    `--brand "${inputs.brand}"`,
    `--language "${inputs.language}"`,
    `--site-type "${inputs.siteType}"`,
    `--out "${outDir}"`,
  ];

  const result = await execute(`node ${args.join(" ")}`, { cwd: repoRoot, category: "development" });
  const simulatedContent = /No LLM provider connected/i.test(result.stdout);
  const actor = await getCurrentActorEmail();

  const websiteRecord = await createWebsiteRecord({
    name: inputs.name,
    siteType: inputs.siteType,
    outDir,
    status: result.success ? "Success" : "Failed",
    simulatedContent,
    error: result.success ? undefined : result.error ?? (result.stderr.trim() || "생성 실패"),
  });

  // 실제로 Website Builder가 생성을 수행했다는 사실 자체는 기존 계측(website.generate /
  // websiteGenerationCount)을 그대로 재사용한다 — Dashboard의 Website Builder 페이지에서
  // 트리거했든 Design Automation 파이프라인에서 트리거했든 "웹사이트가 생성됐다"는 동일한 사건이다.
  await recordAuditEvent({
    action: "website.generate",
    actor,
    success: result.success,
    detail: websiteRecord.status === "Success" ? `"${inputs.name}" (${inputs.siteType}) 생성됨` : websiteRecord.error ?? "생성 실패",
  });
  await incrementMetric("websiteGenerationCount");

  const buildRecord = recordWebsiteBuild({
    reviewId,
    planId: plan.id,
    websiteId: websiteRecord.id,
    siteType: inputs.siteType,
    status: websiteRecord.status,
    simulatedContent,
    error: websiteRecord.error,
    actor,
  });

  // Phase 9 고유 계측 — "Design Automation 파이프라인에서 트리거된 빌드"만 별도로 집계해
  // Dashboard의 Design Automation 섹션에서 필터링/추적할 수 있게 한다(Phase 2~8이 각자의
  // XxxGenerationCount를 aiTaskCount와 별도로 유지한 것과 동일한 원칙).
  await recordAuditEvent({
    action: "design.website.build",
    actor,
    success: result.success,
    detail: result.success
      ? `Website Builder 연동: Review "${reviewId}" → Website "${websiteRecord.id}" v${buildRecord.version} (Hybrid Source: DesignDocument ${hybridSource.document.pages.length}개 페이지 참고, 실제 생성은 inputs 기준)`
      : `Website Builder 연동 실패: Review "${reviewId}" (${buildRecord.error ?? "알 수 없는 오류"})`,
  });
  await incrementMetric("designWebsiteBuildCount");

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: buildRecord.error, build: buildRecord, output: result.stdout },
      { status: 500 }
    );
  }

  return NextResponse.json({ ...toResponse(buildRecord), output: result.stdout });
}
