import { generateStoryboard } from "./storyboard-generator";
import { createStoryboard } from "./storyboard";
import { getDesignPlan } from "./registry";
import { getStoryboardJob, updateStoryboardJobStatus, type StoryboardJobRecord } from "./storyboardJob";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

/**
 * app/api/design/storyboard/route.ts의 기존 POST 핸들러가 하던 일(생성 → 저장 → 감사 로그 →
 * 지표 증가)을 그대로 옮긴 것 — lib/design/generationJobWorker.ts(Design Plan)와 동일한 원칙.
 * 어떤 이유로든 실패하면 Job을 Failed로 기록하고 절대 throw하지 않는다.
 */
export async function runStoryboardJob(jobId: string): Promise<StoryboardJobRecord | undefined> {
  const job = await getStoryboardJob(jobId);
  if (!job) return undefined;

  await updateStoryboardJobStatus(jobId, "Running");

  try {
    const plan = await getDesignPlan(job.input.planId);
    if (!plan) {
      return await updateStoryboardJobStatus(jobId, "Failed", {
        error: `Design Plan "${job.input.planId}"을(를) 찾을 수 없습니다.`,
      });
    }

    const { content, simulated, provider, model } = await generateStoryboard(plan);
    const record = await createStoryboard({ planId: job.input.planId, content, simulated, provider, model });

    const actor = await getCurrentActorEmail();
    await recordAuditEvent({
      action: "design.storyboard.generate",
      actor,
      success: true,
      detail: `Storyboard 생성: "${plan.input.projectName}"${simulated ? " (simulated)" : ""}`,
    });
    await incrementMetric("storyboardGenerationCount");

    return await updateStoryboardJobStatus(jobId, "Success", { resultId: record.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
    return await updateStoryboardJobStatus(jobId, "Failed", { error: message });
  }
}
