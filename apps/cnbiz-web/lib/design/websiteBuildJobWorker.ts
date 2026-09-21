import fs from "fs/promises";
import path from "path";
import { execute } from "@/lib/commandEngine/engine";
import { getDesignPlan } from "@/lib/design/registry";
import { getReview } from "@/lib/design/review-registry";
import { getClaudeDesign } from "@/lib/design/claude-design";
import { getPrototype } from "@/lib/design/prototype";
import { buildWebsiteBuildHybridSource } from "@/lib/design/website-build-document-adapter";
import { getLatestWebsiteBuildForReview, recordWebsiteBuild } from "@/lib/design/website-build";
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
import { getWebsiteBuildJob, updateWebsiteBuildJobStatus, type WebsiteBuildJobRecord } from "./websiteBuildJob";

/**
 * app/api/design/website/route.ts의 기존 POST 핸들러가 하던 일(CLI 생성 → 배포 파이프라인 →
 * 이전 버전 정리 → 감사 로그 → recordWebsiteBuild)을 그대로 옮긴 것 — 로직 자체는 바뀌지 않았고,
 * 호출 시점만 "요청을 받은 그 자리"에서 "별도 Job 실행 라우트"로 옮겼다(lib/design/
 * storyboardJobWorker.ts와 동일한 원칙). 어떤 이유로든 실패하면 Job을 Failed로 기록하고 절대
 * throw하지 않는다.
 *
 * 기존 동기 라우트(app/api/design/website/route.ts)는 계약을 바꾸지 않고 그대로 둔다 — 왜
 * 이 Job 기반 경로가 새로 필요했는지는 lib/design/websiteBuildJob.ts 상단 주석 참고.
 */
function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

  return slug || "website";
}

export async function runWebsiteBuildJob(jobId: string): Promise<WebsiteBuildJobRecord | undefined> {
  const job = await getWebsiteBuildJob(jobId);
  if (!job) return undefined;

  await updateWebsiteBuildJobStatus(jobId, "Running");

  try {
    const { reviewId, outDir: outDirInput } = job.input;

    const review = await getReview(reviewId);
    if (!review) {
      return await updateWebsiteBuildJobStatus(jobId, "Failed", {
        error: `Review "${reviewId}"을(를) 찾을 수 없습니다.`,
      });
    }

    if (review.status !== "approved") {
      return await updateWebsiteBuildJobStatus(jobId, "Failed", {
        error: `Review "${reviewId}"는 아직 승인되지 않았습니다(현재 상태: "${review.status}"). Website Builder 연동은 Approved 상태에서만 가능합니다.`,
      });
    }

    const plan = await getDesignPlan(review.planId);
    if (!plan) {
      return await updateWebsiteBuildJobStatus(jobId, "Failed", {
        error: `Design Plan "${review.planId}"을(를) 찾을 수 없습니다.`,
      });
    }

    const claudeDesign = await getClaudeDesign(review.claudeDesignId);
    const prototype = claudeDesign ? await getPrototype(claudeDesign.prototypeId) : null;

    const cliEntry = resolveCliEntry();
    if (!cliEntry) {
      return await updateWebsiteBuildJobStatus(jobId, "Failed", {
        error: "packages/cli가 아직 빌드되지 않았습니다. `npm run build --workspace=@ai-business-os/cli`를 먼저 실행하세요.",
      });
    }

    const previousBuild = await getLatestWebsiteBuildForReview(reviewId);

    const hybridSource = buildWebsiteBuildHybridSource(plan, prototype);
    const inputs = hybridSource.inputs;
    const slug = slugify(inputs.name);
    const outDir = outDirInput || resolveGeneratedWebsitesDir(`design-${slug}`);

    const documentPath = path.join(resolveCliWorkingDir(), `design-document-${review.id}.json`);
    await fs.writeFile(documentPath, JSON.stringify(hybridSource.document), "utf-8");

    const contextPath = inputs.additionalContext
      ? path.join(resolveCliWorkingDir(), `design-context-${review.id}.txt`)
      : undefined;
    if (contextPath) await fs.writeFile(contextPath, inputs.additionalContext ?? "", "utf-8");

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
      await fs.rm(documentPath, { force: true }).catch(() => {});
      if (contextPath) await fs.rm(contextPath, { force: true }).catch(() => {});
    }

    const simulatedContent = /No LLM provider connected/i.test(result.stdout);
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

    await recordAuditEvent({
      action: "website.generate",
      actor,
      success: result.success,
      detail: websiteRecord.status === "Success" ? `"${inputs.name}" (${inputs.siteType}) 생성됨` : websiteRecord.error ?? "생성 실패",
    });
    await incrementMetric("websiteGenerationCount");

    if (websiteRecord.status === "Success") {
      try {
        await runDeploymentPipeline({
          websiteId: websiteRecord.id,
          outDir,
          repoBaseName: inputs.siteType || "site",
        });

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
      return await updateWebsiteBuildJobStatus(jobId, "Failed", { error: buildRecord.error });
    }

    return await updateWebsiteBuildJobStatus(jobId, "Success", { resultId: buildRecord.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
    return await updateWebsiteBuildJobStatus(jobId, "Failed", { error: message });
  }
}
