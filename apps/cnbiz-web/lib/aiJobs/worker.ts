// lib/aiJobs/worker.ts

import type { CollectionStore } from "@/lib/db/collectionStore";
import { getWebsiteOrder } from "@/lib/websiteOrders/registry";
import { getWebsite } from "@/lib/websites/registry";
import { runDeploymentPipeline } from "@/lib/deployment/pipeline";
import { getAiJob, listAiJobs, updateAiJobStatus } from "./registry";
import { executeJob } from "./executor";

/**
 * Queued 상태의 AI Job들을 순차적으로 처리한다.
 */
export async function processQueuedJobs(): Promise<void> {
  const jobs = await listAiJobs();

  const queuedJobs = jobs.filter(
    (job) => job.status === "Queued"
  );

  for (const job of queuedJobs) {
    await processJob(job.id);
  }
}

/**
 * AI Business OS Rewiring Phase 3 — AI Generate(Website Builder) 성공 직후, 그 산출물로 이어지는
 * 배포 파이프라인(lib/deployment/pipeline.ts)을 트리거한다. executor.ts는 생성된 Website의 id를
 * 직접 반환하지 않으므로(기존 시그니처를 건드리지 않기 위해), WebsiteOrder.websiteIds의 마지막
 * 항목(이 Job이 방금 추가한 것 — lib/aiJobs/executor.ts의 addWebsiteToOrder() 참고)을 그 Job이
 * 생성한 Website로 취급한다. `deployFn`/`store`는 테스트에서 실제 네트워크 호출 없이 주입 가능.
 */
export async function triggerDeployment(
  jobId: string,
  deployFn: typeof runDeploymentPipeline = runDeploymentPipeline,
  store?: CollectionStore
): Promise<void> {
  const job = await getAiJob(jobId, store);
  if (!job) return;

  const websiteOrder = await getWebsiteOrder(job.websiteOrderId, store);
  if (!websiteOrder || websiteOrder.websiteIds.length === 0) return;

  const websiteId = websiteOrder.websiteIds[websiteOrder.websiteIds.length - 1];
  const website = await getWebsite(websiteId, store);
  if (!website || website.status !== "Success") return;

  await deployFn(
    { websiteId: website.id, outDir: website.outDir, repoBaseName: website.siteType || "site" },
    undefined,
    store
  );
}

/**
 * 단일 Job 처리
 */
export async function processJob(
  jobId: string,
  deployFn: typeof runDeploymentPipeline = runDeploymentPipeline,
  store?: CollectionStore
): Promise<void> {
  try {
    // Running
    await updateAiJobStatus(jobId, "Running", {}, store);

    // 실제 Website Builder 실행 — Phase 3 이전과 완전히 동일, 이 함수는 수정하지 않았다.
    await executeJob(jobId);

    // Success
    await updateAiJobStatus(jobId, "Success", {}, store);

    // 배포 파이프라인은 생성 성공과 독립적인 후속 단계다 — 실패해도 이미 기록된 AiJob의
    // "Success"를 되돌리지 않는다(생성 자체는 성공했으므로). 실패 원인은
    // WebsiteRecord.deploymentStatus/deploymentError와 Audit Log에 남는다.
    await triggerDeployment(jobId, deployFn, store).catch((error) => {
      console.error(`Deployment pipeline failed for AI Job ${jobId}`, error);
    });
  } catch (error) {
    console.error(`AI Job ${jobId} failed`, error);

    // Failed
    await updateAiJobStatus(jobId, "Failed", {}, store);
  }
}