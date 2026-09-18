import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { execute } from "@/lib/commandEngine/engine";
import { getDesignPlan } from "@/lib/design/registry";
import { getReview } from "@/lib/design/review-registry";
import { getClaudeDesign } from "@/lib/design/claude-design";
import { getPrototype } from "@/lib/design/prototype";
import { buildWebsiteBuildHybridSource } from "@/lib/design/website-build-document-adapter";
import {
  getLatestWebsiteBuildForReview,
  listWebsiteBuilds,
  recordWebsiteBuild,
  type WebsiteBuildRecord,
} from "@/lib/design/website-build";
import { createWebsiteRecord, getWebsite, updateWebsiteDeployment } from "@/lib/websites/registry";
import { runDeploymentPipeline } from "@/lib/deployment/pipeline";
import { shouldCleanupPreviousWebsite } from "@/lib/design/website-build-cleanup";
import { deleteRepository } from "@/lib/github/client";
import { deleteProject } from "@/lib/vercel/client";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";
import {
  isUnderGeneratedWebsitesScratch,
  resolveCliEntry,
  resolveCliWorkingDir,
  resolveGeneratedWebsitesDir,
} from "@/lib/paths/repoRoot";

// app/api/design/requirements/route.ts와 동일한 이유 — 실제 Website Builder CLI 실행(다수
// 페이지의 콘텐츠를 생성하는 여러 AI 호출 포함)은 다른 Design 체인 단계보다도 오래 걸릴 수
// 있다. maxDuration 미설정 시 Vercel 기본 상한에 걸려 조용히 실패할 수 있어 Vercel Pro 기본
// 상한인 300초로 설정(2026-09-14).
export const maxDuration = 300;

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
  return NextResponse.json({ builds: await listWebsiteBuilds() });
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
 *
 * Deployment(2026-09-17 추가) — 생성이 성공하면 lib/deployment/pipeline.ts의
 * runDeploymentPipeline()을 그대로 호출해 실제 GitHub Repository + Vercel Preview 배포까지
 * 이어서 수행한다(lib/aiJobs/worker.ts의 triggerDeployment()와 동일한 패턴 재사용). 그 전까지는
 * outDir가 서버리스 임시 파일시스템(os.tmpdir())을 가리켜, "Success"가 떠도 실제로 접근 가능한
 * 결과물이 전혀 없었다. 결과는 WebsiteRecord.deployment*에 기록되며, 프론트엔드는
 * GET /api/websites/[id]로 다시 조회해 배포 상태·URL을 표시한다.
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

  const cliEntry = resolveCliEntry();

  if (!cliEntry) {
    return NextResponse.json(
      {
        success: false,
        error:
          "packages/cli가 아직 빌드되지 않았습니다. `npm run build --workspace=@ai-business-os/cli`를 먼저 실행하세요.",
      },
      { status: 400 }
    );
  }

  // 이 Review로 이전에 만든 Build가 있으면 websiteId를 기억해둔다 — recordWebsiteBuild()가
  // 아래에서 이 값을 새 websiteId로 덮어쓰기 전에 먼저 읽어야 한다. 이번 빌드가 성공하면 이
  // 이전 버전의 GitHub 저장소·Vercel 프로젝트를 정리하는 데 쓴다(같은 Review를 재빌드할 때마다
  // 매번 새 저장소·프로젝트가 쌓이고, 관리자가 어떤 링크가 최신인지 헷갈리는 문제를 실사용 중
  // 발견 — 2026-09-18).
  const previousBuild = await getLatestWebsiteBuildForReview(reviewId);

  const hybridSource = buildWebsiteBuildHybridSource(plan, prototype);
  const inputs = hybridSource.inputs;
  const slug = slugify(inputs.name);
  const outDir = outDirInput || resolveGeneratedWebsitesDir(`design-${slug}`);

  // Design 체인의 DesignDocument를 Website Builder로 실제로 넘기는 지점. hybridSource는 이전
  // Phase부터 document를 만들어 두고 있었지만 inputs만 쓰이고 버려져서, Wireframe·Prototype·
  // Claude Design의 결과가 생성 코드에 전혀 반영되지 않았다(같은 siteType이면 Design 체인을
  // 거치든 말든 .tsx가 바이트 단위로 동일했다). CLI는 파일 경로로만 받으므로 임시 파일에 쓴다.
  const documentPath = path.join(resolveCliWorkingDir(), `design-document-${review.id}.json`);
  await fs.writeFile(documentPath, JSON.stringify(hybridSource.document), "utf-8");

  // Requirement Analysis·Feature List·Customer Requirements 원문(inputs.additionalContext,
  // website-build-adapter.ts의 buildAdditionalContext())을 Content Engine에 전달하는 지점.
  // 지금까지는 이 상세 기획 내용이 DesignDocument(구조)에만 쓰이고 실제 문구를 쓰는 단계에는
  // 전혀 전달되지 않아, 기획을 아무리 자세히 해도 최종 콘텐츠는 businessType/audience 같은
  // 짧은 값만 보고 일반적으로 써졌다(2026-09-17, 실사용 중 발견). documentPath와 동일하게
  // 임시 파일로 전달한다 — 이 텍스트는 관리자가 자유롭게 입력한 값이라 따옴표·줄바꿈 등을
  // 포함할 수 있어, 셸 문자열에 직접 삽입하면 명령이 깨지거나 이스케이프 문제가 생길 수 있다.
  const contextPath = inputs.additionalContext
    ? path.join(resolveCliWorkingDir(), `design-context-${review.id}.txt`)
    : undefined;
  if (contextPath) await fs.writeFile(contextPath, inputs.additionalContext ?? "", "utf-8");

  // 같은 Review로 재시도하면 outDir(design-${slug})가 항상 동일한 경로로 계산되는데,
  // generateFromTemplate()(packages/cli)은 대상 폴더가 이미 있으면 "Target already exists"로
  // 거부한다. Vercel의 warm 서버리스 컨테이너는 여러 요청에 걸쳐 같은 /tmp를 재사용하므로,
  // 이전 시도(성공/실패 무관)가 남긴 산출물이 재시도를 항상 막는 문제가 실제 프로덕션에서
  // 재현됨(2026-09-17 — #126/#127로 배포 파이프라인을 고친 뒤 같은 Review로 재시도하다 발견).
  // scratch 영역(os.tmpdir() 하위) 밖을 가리키는 경우(관리자가 폼에 직접 입력한 임의 경로)는
  // 안전을 위해 지우지 않는다.
  if (isUnderGeneratedWebsitesScratch(outDir)) {
    await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
  }

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
    `--design-document "${documentPath}"`,
    ...(contextPath ? [`--context-file "${contextPath}"`] : []),
  ];

  let result;
  try {
    result = await execute(`node ${args.join(" ")}`, { cwd: resolveCliWorkingDir(), category: "development" });
  } finally {
    // 생성 성공 여부와 무관하게 임시 문서는 남기지 않는다.
    await fs.rm(documentPath, { force: true }).catch(() => {});
    if (contextPath) await fs.rm(contextPath, { force: true }).catch(() => {});
  }

  const simulatedContent = /No LLM provider connected/i.test(result.stdout);
  // packages/cli/src/commands/website.ts가 실제 폴백 이유를 별도의 "Reason: " 줄로 출력한다
  // (2026-09-17 — ANTHROPIC_API_KEY가 설정돼 있는데도 Simulated가 뜨는 문제를 조사하다,
  // 지금까지는 이 이유가 어디에도 남지 않았음을 발견해 추가). 이유 문자열 자체에 괄호가 들어있어
  // 괄호로 감싸는 형식은 중첩 괄호 때문에 정규식으로 온전히 못 뽑아내(처음에 이 방식으로 했다가
  // 실제로 겪은 문제) 별도 줄로 바꿨다 — [^\n]+로 줄 끝까지 통째로 캡처한다.
  const simulatedReason = /^Reason: (.+)$/m.exec(result.stdout)?.[1]?.trim() ?? undefined;
  const designPageCount = Number(/Design Document applied — (\d+) page/.exec(result.stdout)?.[1] ?? 0);
  const actor = await getCurrentActorEmail();

  const websiteRecord = await createWebsiteRecord({
    name: inputs.name,
    siteType: inputs.siteType,
    outDir,
    status: result.success ? "Success" : "Failed",
    simulatedContent,
    simulatedReason,
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

  // outDir(os.tmpdir() 하위)는 이 요청이 처리되는 동안만 존재하는 서버리스 임시 파일시스템이라,
  // 여기서 코드를 실제 GitHub 저장소로 push하고 Vercel Preview까지 배포하지 않으면 생성된
  // 코드는 이 응답이 끝나는 즉시 사라져 관리자가 다시 접근할 방법이 없다(2026-09-17 실사용 —
  // "Success"가 떴는데 실제로 볼 수 있는 화면이 없음을 발견). lib/aiJobs/worker.ts의
  // triggerDeployment()가 의뢰 접수 파이프라인에서 이미 검증된 방식으로 동일한 파이프라인을
  // 호출하는 것과 완전히 동일한 패턴 — 새 배포 로직을 만들지 않고 그대로 재사용한다.
  // GITHUB_TOKEN/VERCEL_TOKEN이 없으면 파이프라인 자체가 예외 없이 "NotConfigured" 상태만
  // 기록하고 끝나므로, 여기서 별도로 존재 여부를 확인할 필요가 없다.
  // 2026-09-18 — runDeploymentPipeline() 자체는 내부적으로 자기 완결적인 try/catch로
  // 감싸여 있어(lib/deployment/pipeline.ts) 정상적인 실패(GitHub/Vercel API 오류 등)는
  // 절대 여기까지 예외로 올라오지 않지만, 그 catch 블록 "안"에서 실행되는 recordAuditEvent()·
  // updateWebsiteDeployment() 자체가 실패하는 경우(예: DB 일시 장애)는 그 함수도 방어하지
  // 못하고 그대로 위로 던져진다. 이전에는 이 호출 자체가 try/catch 밖에 있어, 그런 극단적인
  // 경우 POST 핸들러 전체가 중단되어 응답이 도중에 끊기고(클라이언트의 "Unexpected end of
  // JSON input") 아래 recordWebsiteBuild()까지 도달하지 못해 이번 빌드가 History에 전혀
  // 기록되지 않는 문제를 실사용 중 재현(PR #136 직후, 이어서 PR #137로 정리 코드만 먼저
  // 방어했으나 배포 파이프라인 호출 자체는 여전히 무방비였음). 정리 코드와 함께 이 호출까지
  // 하나의 try/catch로 감싸, 무엇이 원인이든 이번 빌드의 History 기록은 항상 보장한다.
  if (websiteRecord.status === "Success") {
    try {
      await runDeploymentPipeline({
        websiteId: websiteRecord.id,
        outDir,
        repoBaseName: inputs.siteType || "site",
      });

      // 이전 버전 정리 — shouldCleanupPreviousWebsite()가 "정리해도 되는 시도"라고 판단할
      // 때만 직전 버전(다른 websiteId)의 저장소·프로젝트를 삭제한다(이미 운영 배포로 확정된
      // 배포는 그 함수가 절대 대상에 포함하지 않는다).
      const previousWebsite = previousBuild ? await getWebsite(previousBuild.websiteId) : undefined;

      if (previousWebsite && shouldCleanupPreviousWebsite(previousBuild, websiteRecord.id, previousWebsite)) {
        if (previousWebsite.repository) {
          const repoResult = await deleteRepository(previousWebsite.repository.fullName);
          await recordAuditEvent({
            action: "deployment.cleanup.github_repo",
            actor,
            success: repoResult.success,
            detail: repoResult.success
              ? `이전 버전 저장소 삭제됨: ${previousWebsite.repository.fullName}`
              : (repoResult.error ?? "저장소 삭제 실패"),
            metadata: { websiteId: previousWebsite.id },
          });
        }

        if (previousWebsite.deployment) {
          const projectResult = await deleteProject(previousWebsite.deployment.vercelProjectId);
          await recordAuditEvent({
            action: "deployment.cleanup.vercel_project",
            actor,
            success: projectResult.success,
            detail: projectResult.success
              ? `이전 버전 Vercel 프로젝트 삭제됨: ${previousWebsite.deployment.vercelProjectName}`
              : (projectResult.error ?? "Vercel 프로젝트 삭제 실패"),
            metadata: { websiteId: previousWebsite.id },
          });
        }
      }
    } catch (deploymentError) {
      // 다음에 같은 문제가 재현되면 관리자가 /developer/audit-log·/developer/errors에서 직접
      // 원인을 확인할 수 있도록, 메시지뿐 아니라 스택 앞부분(어느 파일·몇 번째 줄에서 던졌는지)도
      // 함께 남긴다 — 이 세션 환경에는 실제 Vercel Runtime Logs 접근 권한이 없어, Audit Log가
      // 사실상 유일하게 확인 가능한 진단 정보다.
      const message =
        deploymentError instanceof Error
          ? [deploymentError.message, ...(deploymentError.stack?.split("\n").slice(1, 6) ?? [])].join("\n")
          : "배포/이전 버전 정리 중 알 수 없는 오류가 발생했습니다.";

      await recordAuditEvent({
        action: "deployment.pipeline.failed",
        actor,
        success: false,
        detail: message,
        metadata: { websiteId: websiteRecord.id },
      });

      // runDeploymentPipeline() 자신이 실패를 기록하기 전에 예외가 새어나온 경우
      // deploymentStatus가 갱신되지 않아 "배포 전" 상태로 잘못 남을 수 있어 여기서도 갱신한다.
      // 레코드가 아직 없거나 이미 다른 상태로 갱신돼 있어도 조용히 무시된다(updateWebsiteDeployment()가
      // 존재하지 않는 id에 undefined를 반환하는 것과 동일한 안전한 실패 처리).
      await updateWebsiteDeployment(websiteRecord.id, {
        deploymentStatus: "Failed",
        deploymentError: message,
      }).catch(() => {});
    }
  }

  const buildRecord = await recordWebsiteBuild({
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
      ? `Website Builder 연동: Review "${reviewId}" → Website "${websiteRecord.id}" v${buildRecord.version} ` +
        `(DesignDocument ${hybridSource.document.pages.length}개 페이지 중 ${designPageCount}개를 React Generator로 생성)`
      : `Website Builder 연동 실패: Review "${reviewId}" (${buildRecord.error ?? "알 수 없는 오류"})`,
  });
  await incrementMetric("designWebsiteBuildCount");

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: buildRecord.error, build: buildRecord, output: result.stdout },
      { status: 500 }
    );
  }

  // designPageCount는 "이 빌드에서 디자인이 실제로 코드에 반영된 페이지 수"다. 0이면 스캐폴딩
  // 템플릿 그대로라는 뜻이므로, 호출자가 성공 응답만 보고 반영됐다고 오해하지 않도록 노출한다.
  return NextResponse.json({ ...toResponse(buildRecord), designPageCount, output: result.stdout });
}
