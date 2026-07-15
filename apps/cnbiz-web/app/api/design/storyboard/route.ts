import { NextResponse } from "next/server";
import { generateStoryboard } from "@/lib/design/storyboard-generator";
import { createStoryboard, listStoryboards } from "@/lib/design/storyboard";
import { getDesignPlan } from "@/lib/design/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ storyboards: await listStoryboards() });
}

/**
 * docs/03_DESIGN 스펙의 `POST /api/design/storyboard`. Phase 1의 DesignPlanRecord(`planId`)
 * 위에서 Screen Flow/User Journey/Navigation Flow/Page Sequence/Screen Description을 생성한다.
 * 응답은 스펙이 명시한 `{ storyboardId, projectId, screens, flow }`를 그대로 포함하고, Dashboard가
 * 필요로 하는 나머지 상세(userJourneys/navigationFlow/pageSequence)는 `storyboard` 아래에 추가로
 * 담는다(요구사항 4번 계층 — Site Map/Screen List/Navigation/Journey를 모두 화면에 표시해야 함).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const planId = isRecord(body) && typeof body.planId === "string" ? body.planId.trim() : "";

  if (!planId) {
    return NextResponse.json({ success: false, error: "planId는 필수입니다." }, { status: 400 });
  }

  const plan = await getDesignPlan(planId);
  if (!plan) {
    return NextResponse.json({ success: false, error: `Design Plan "${planId}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  const { content, simulated, provider, model } = await generateStoryboard(plan);
  const record = await createStoryboard({ planId, content, simulated, provider, model });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.storyboard.generate",
    actor,
    success: true,
    detail: `Storyboard 생성: "${plan.input.projectName}"${simulated ? " (simulated)" : ""}`,
  });
  await incrementMetric("storyboardGenerationCount");

  return NextResponse.json({
    success: true,
    storyboardId: record.id,
    projectId: record.planId,
    screens: record.content.screenDescriptions,
    flow: record.content.screenFlow,
    storyboard: record,
  });
}
