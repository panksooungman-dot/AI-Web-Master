// lib/aiJobs/worker.ts

import { listAiJobs, updateAiJobStatus } from "./registry";
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
 * 단일 Job 처리
 */
export async function processJob(jobId: string): Promise<void> {
  try {
    // Running
    await updateAiJobStatus(jobId, "Running");

    // 실제 Website Builder 실행
    await executeJob(jobId);

    // Success
    await updateAiJobStatus(jobId, "Success");
  } catch (error) {
    console.error(`AI Job ${jobId} failed`, error);

    // Failed
    await updateAiJobStatus(jobId, "Failed");
  }
}