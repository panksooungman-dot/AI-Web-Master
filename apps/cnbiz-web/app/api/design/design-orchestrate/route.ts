import { NextResponse } from "next/server";
import { runDesignChainOrchestration } from "@/lib/design/design-chain-orchestrator";
import type { DesignPlanInput } from "@/lib/design/types";
import { recordAuditEvent, type AuditAction } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric, type MetricsCounters } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? (body[key] as string).trim() : "";
}

/**
 * Design Automation — Chain A Orchestrator. `POST /api/design/requirements`부터
 * `POST /api/design/review`까지 5개 산출물(Requirements → Storyboard → Wireframe → Prototype →
 * Claude Design)을 한 번의 요청으로 생성하고, 그 위에 Review를 시작(`in_review`)해 둔 상태로
 * 반환한다(lib/design/design-chain-orchestrator.ts 참고) — 그 이후(승인/반려/수정요청, Figma
 * Export, Design Sync, Website Build)는 사람의 판단이 필요한 영역이라 이 오케스트레이터가
 * 대신하지 않는다. 각 단계는 개별 라우트(`/api/design/storyboard` 등)를 그대로 호출했을 때와
 * 동일한 Audit Log 액션·Metrics 카운터를 기록하고, `design.chain-orchestrate.run`으로 "전
 * 구간을 한 번에 실행했다"는 사실을 추가로 기록한다.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const projectName = str(body, "projectName");
  const projectType = str(body, "projectType");
  const requirements = str(body, "requirements");
  const targetUsers = str(body, "targetUsers");
  const projectId = str(body, "projectId") || undefined;

  if (!projectName || !requirements) {
    return NextResponse.json(
      { success: false, error: "projectName·requirements는 필수입니다." },
      { status: 400 }
    );
  }

  const input: DesignPlanInput = { projectName, projectType, requirements, targetUsers, projectId };
  const actor = await getCurrentActorEmail();
  const result = await runDesignChainOrchestration(input, undefined, undefined, actor);

  const stages: { action: AuditAction; metric: keyof MetricsCounters; detail: string }[] = [
    {
      action: "design.generate",
      metric: "aiTaskCount",
      detail: `Design Plan 생성: "${projectName}"${result.designPlan.simulated ? " (simulated)" : ""}`,
    },
    {
      action: "design.storyboard.generate",
      metric: "storyboardGenerationCount",
      detail: `Storyboard 생성: "${projectName}"${result.storyboard.simulated ? " (simulated)" : ""}`,
    },
    {
      action: "design.wireframe.generate",
      metric: "wireframeGenerationCount",
      detail: `Wireframe 생성: Storyboard "${result.storyboard.id}"${result.wireframe.simulated ? " (simulated)" : ""}`,
    },
    {
      action: "design.prototype.generate",
      metric: "prototypeGenerationCount",
      detail: `Prototype 생성(v${result.prototype.version}): Wireframe "${result.wireframe.id}"${
        result.prototype.simulated ? " (simulated)" : ""
      }`,
    },
    {
      action: "design.claude.generate",
      metric: "claudeDesignGenerationCount",
      detail: `Claude Design Prompt 생성: Prototype "${result.prototype.id}"${
        result.claudeDesign.simulated ? " (simulated)" : ""
      }`,
    },
    {
      action: "design.review.create",
      metric: "reviewCount",
      detail: `Review 생성(v${result.review.version}): Claude Design "${result.claudeDesign.id}"`,
    },
  ];

  for (const stage of stages) {
    await recordAuditEvent({ action: stage.action, actor, success: true, detail: stage.detail });
    await incrementMetric(stage.metric);
  }

  const anySimulated = [
    result.designPlan.simulated,
    result.storyboard.simulated,
    result.wireframe.simulated,
    result.prototype.simulated,
    result.claudeDesign.simulated,
  ].some(Boolean);

  await recordAuditEvent({
    action: "design.chain-orchestrate.run",
    actor,
    success: true,
    detail: `Chain A 자동 생성 완료: "${projectName}" (Plan→Storyboard→Wireframe→Prototype→Claude Design→Review, reviewId=${
      result.review.id
    })${anySimulated ? " (일부 simulated)" : ""}`,
  });
  await incrementMetric("designChainOrchestrationRunCount");

  return NextResponse.json({
    success: true,
    planId: result.planId,
    storyboardId: result.storyboard.id,
    wireframeId: result.wireframe.id,
    prototypeId: result.prototype.id,
    claudeDesignId: result.claudeDesign.id,
    reviewId: result.review.id,
    reviewStatus: result.review.status,
    result,
  });
}
