import { generateClaudeDesign } from "./claude-design-generator";
import { createClaudeDesign } from "./claude-design";
import { getPrototype } from "./prototype";
import { getClaudeDesignJob, updateClaudeDesignJobStatus, type ClaudeDesignJobRecord } from "./claudeDesignJob";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

/** app/api/design/claude/route.ts의 기존 POST 핸들러 로직을 그대로 옮긴 것. lib/design/storyboardJobWorker.ts와 동일한 원칙. */
export async function runClaudeDesignJob(jobId: string): Promise<ClaudeDesignJobRecord | undefined> {
  const job = await getClaudeDesignJob(jobId);
  if (!job) return undefined;

  await updateClaudeDesignJobStatus(jobId, "Running");

  try {
    const prototype = await getPrototype(job.input.prototypeId);
    if (!prototype) {
      return await updateClaudeDesignJobStatus(jobId, "Failed", {
        error: `Prototype "${job.input.prototypeId}"을(를) 찾을 수 없습니다.`,
      });
    }

    const { content, simulated, provider, model } = await generateClaudeDesign(prototype);
    const record = await createClaudeDesign({
      prototypeId: job.input.prototypeId,
      planId: prototype.planId,
      content,
      simulated,
      provider,
      model,
    });

    const actor = await getCurrentActorEmail();
    await recordAuditEvent({
      action: "design.claude.generate",
      actor,
      success: true,
      detail: `Claude Design Prompt 생성: Prototype "${job.input.prototypeId}"${simulated ? " (simulated)" : ""}`,
    });
    await incrementMetric("claudeDesignGenerationCount");

    return await updateClaudeDesignJobStatus(jobId, "Success", { resultId: record.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
    return await updateClaudeDesignJobStatus(jobId, "Failed", { error: message });
  }
}
