import { generatePrototype } from "./prototype-generator";
import { createPrototype } from "./prototype";
import { getWireframe } from "./wireframe";
import { getPrototypeJob, updatePrototypeJobStatus, type PrototypeJobRecord } from "./prototypeJob";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

/** app/api/design/prototype/route.ts의 기존 POST 핸들러 로직을 그대로 옮긴 것. lib/design/storyboardJobWorker.ts와 동일한 원칙. */
export async function runPrototypeJob(jobId: string): Promise<PrototypeJobRecord | undefined> {
  const job = await getPrototypeJob(jobId);
  if (!job) return undefined;

  await updatePrototypeJobStatus(jobId, "Running");

  try {
    const wireframe = await getWireframe(job.input.wireframeId);
    if (!wireframe) {
      return await updatePrototypeJobStatus(jobId, "Failed", {
        error: `Wireframe "${job.input.wireframeId}"을(를) 찾을 수 없습니다.`,
      });
    }

    const { content, simulated, provider, model } = await generatePrototype(wireframe);
    const record = await createPrototype({
      wireframeId: job.input.wireframeId,
      planId: wireframe.planId,
      content,
      simulated,
      provider,
      model,
    });

    const actor = await getCurrentActorEmail();
    await recordAuditEvent({
      action: "design.prototype.generate",
      actor,
      success: true,
      detail: `Prototype 생성(v${record.version}): Wireframe "${job.input.wireframeId}"${simulated ? " (simulated)" : ""}`,
    });
    await incrementMetric("prototypeGenerationCount");

    return await updatePrototypeJobStatus(jobId, "Success", { resultId: record.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
    return await updatePrototypeJobStatus(jobId, "Failed", { error: message });
  }
}
