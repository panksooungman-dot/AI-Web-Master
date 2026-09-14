import { generateDesignPlan } from "./generator";
import { createDesignPlan } from "./registry";
import { getDesignPlanJob, updateDesignPlanJobStatus, type DesignPlanJobRecord } from "./generationJob";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

/**
 * app/api/design/requirements/route.ts의 기존 POST 핸들러가 하던 일(생성 → 저장 → 감사 로그 →
 * 지표 증가)을 그대로 옮긴 것 — 로직 자체는 바뀌지 않았고, 호출 시점만 "요청을 받은 그
 * 자리"에서 "별도 Job 실행 라우트"로 옮겼다. 어떤 이유로든 실패하면(AI 호출 자체의 예외 등)
 * Job을 Failed로 기록하고 절대 throw하지 않는다 — lib/aiJobs/worker.ts의 processJob()과
 * 동일한 원칙(호출자가 HTTP 상태가 아니라 job.status/job.error로 결과를 판단).
 */
export async function runDesignPlanJob(jobId: string): Promise<DesignPlanJobRecord | undefined> {
  const job = await getDesignPlanJob(jobId);
  if (!job) return undefined;

  await updateDesignPlanJobStatus(jobId, "Running");

  try {
    const { content, simulated, provider, model } = await generateDesignPlan(job.input);
    const record = await createDesignPlan({ input: job.input, content, simulated, provider, model });

    const actor = await getCurrentActorEmail();
    await recordAuditEvent({
      action: "design.generate",
      actor,
      success: true,
      detail: `Design Plan 생성: "${job.input.projectName}"${simulated ? " (simulated)" : ""}`,
    });
    await incrementMetric("aiTaskCount");

    return await updateDesignPlanJobStatus(jobId, "Success", { planId: record.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
    return await updateDesignPlanJobStatus(jobId, "Failed", { error: message });
  }
}
