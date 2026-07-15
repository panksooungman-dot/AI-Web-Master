import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { execute } from "@/lib/commandEngine/engine";
import { getDesignPlan } from "@/lib/design/registry";
import { getReview } from "@/lib/design/review-registry";
import { planToWebsiteBuildInputs } from "@/lib/design/website-build-adapter";
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
 * `POST /api/design/website` — Design Automation Phase 9. 새로운 생성 엔진을 만들지 않고
 * 기존 Website Builder v2를 그대로 재사용한다 — 이 라우트가 조립하는 실행 경로는
 * `app/api/websites/route.ts`(Dashboard의 Website Builder 페이지)와 완전히 동일한
 * `node packages/cli/dist/index.js website create ...` child process 호출이다. 유일한 차이는
 * 입력값의 출처: 여기서는 사람이 폼에 직접 입력하는 대신 Phase 6에서 승인된 Design Plan(Phase 1
 * Requirement Analysis)을 어댑터(website-build-adapter.ts)로 변환해 사용한다.
 *
 * Approval Rule(Phase 7 Figma Export와 동일한 원칙) — Review 상태가 "approved"가 아니면 409를
 * 반환한다. 실제 코드를 생성하는 마지막 단계이므로, 참고 자료 성격인 Figma Import보다는 Figma
 * Export/Design Sync와 같은 게이트를 적용하는 것이 맞다고 판단했다.
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

  const review = getReview(reviewId);
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

  const plan = getDesignPlan(review.planId);
  if (!plan) {
    return NextResponse.json(
      { success: false, error: `Design Plan "${review.planId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

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

  const inputs = planToWebsiteBuildInputs(plan);
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
      ? `Website Builder 연동: Review "${reviewId}" → Website "${websiteRecord.id}" v${buildRecord.version}`
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
