import { generateWireframe } from "./wireframe-generator";
import { createWireframe } from "./wireframe";
import { getStoryboard } from "./storyboard";
import { getWireframeJob, updateWireframeJobStatus, type WireframeJobRecord } from "./wireframeJob";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

/** app/api/design/wireframe/route.ts의 기존 POST 핸들러 로직을 그대로 옮긴 것. lib/design/storyboardJobWorker.ts와 동일한 원칙. */
export async function runWireframeJob(jobId: string): Promise<WireframeJobRecord | undefined> {
  const job = await getWireframeJob(jobId);
  if (!job) return undefined;

  await updateWireframeJobStatus(jobId, "Running");

  try {
    const storyboard = await getStoryboard(job.input.storyboardId);
    if (!storyboard) {
      return await updateWireframeJobStatus(jobId, "Failed", {
        error: `Storyboard "${job.input.storyboardId}"을(를) 찾을 수 없습니다.`,
      });
    }

    const { content, simulated, provider, model } = await generateWireframe(storyboard);
    const record = await createWireframe({
      storyboardId: job.input.storyboardId,
      planId: storyboard.planId,
      content,
      simulated,
      provider,
      model,
    });

    const actor = await getCurrentActorEmail();
    await recordAuditEvent({
      action: "design.wireframe.generate",
      actor,
      success: true,
      detail: `Wireframe 생성: Storyboard "${job.input.storyboardId}"${simulated ? " (simulated)" : ""}`,
    });
    await incrementMetric("wireframeGenerationCount");

    return await updateWireframeJobStatus(jobId, "Success", { resultId: record.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
    return await updateWireframeJobStatus(jobId, "Failed", { error: message });
  }
}
