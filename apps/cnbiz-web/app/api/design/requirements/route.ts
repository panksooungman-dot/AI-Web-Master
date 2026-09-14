import { NextResponse } from "next/server";
import { generateDesignPlan } from "@/lib/design/generator";
import { createDesignPlan, listDesignPlans } from "@/lib/design/registry";
import type { DesignPlanInput } from "@/lib/design/types";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

// AI 호출 1회가 최대 2분(providers/provider.ts의 DEFAULT_TIMEOUT_MS)까지 걸릴 수 있어, Vercel
// 서버리스 함수의 실행 시간 제한을 넘기면 정상 JSON 대신 타임아웃 에러 페이지가 반환돼
// 클라이언트가 이를 파싱하지 못하고 실패한다(Generate 버튼이 "안 눌리는 것처럼" 보이거나
// "Unexpected token..."/"Failed to fetch" 원시 오류가 뜨던 원인 — 2026-09-14 실사용 재현:
// Customer Requirements가 긴 의뢰(첨부 기획서 전문을 그대로 붙여넣은 경우)에서 AI 응답이
// 60초를 넘겨 실패). 이전에는 Hobby 플랜을 포함한 모든 Vercel 플랜이 지원하는 상한인 60초로
// 맞췄으나, 이 프로젝트는 Pro 플랜이라 더 높은 값을 설정할 수 있음을 확인(2026-09-14) —
// Vercel Pro의 기본 상한인 300초(Fluid Compute 미사용 기준)로 상향해 AI 호출 1회(최대 120초)가
// 안전하게 끝날 여유를 확보한다. 극단적인 경우(3회 재시도 전부 120초씩 타임아웃, 이론상 최대
// 약 361초)까지는 커버하지 못하지만, 그 경우는 AI Provider 자체가 응답하지 않는 상황이라
// maxDuration을 더 늘려도 사용자 경험이 크게 나아지지 않는다.
export const maxDuration = 300;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? (body[key] as string).trim() : "";
}

export async function GET() {
  return NextResponse.json({ plans: await listDesignPlans() });
}

/**
 * docs/03_DESIGN/CLAUDE_DESIGN_INTEGRATION.md 14번 항목에 명시된 `POST /api/design/requirements`.
 * Requirement Analysis/Feature List/Site Map/User Flow/Screen List 5종을 한 번에 생성한다(스펙
 * 문서의 Dashboard Integration도 이 5종을 "Requirements" 메뉴 하나로 묶어 보여주므로 API를
 * 쪼개지 않았다).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ success: false, error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const projectName = str(body, "projectName");
  const projectType = str(body, "projectType");
  const requirements = str(body, "requirements");
  const targetUsers = str(body, "targetUsers");
  const projectId = typeof body.projectId === "string" && body.projectId.trim() ? body.projectId.trim() : undefined;

  if (!projectName || !projectType || !requirements || !targetUsers) {
    return NextResponse.json(
      { success: false, error: "projectName, projectType, requirements, targetUsers는 모두 필수입니다." },
      { status: 400 }
    );
  }

  const input: DesignPlanInput = { projectName, projectType, requirements, targetUsers, projectId };
  const { content, simulated, provider, model } = await generateDesignPlan(input);
  const record = await createDesignPlan({ input, content, simulated, provider, model });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.generate",
    actor,
    success: true,
    detail: `Design Plan 생성: "${projectName}"${simulated ? " (simulated)" : ""}`,
  });
  await incrementMetric("aiTaskCount");

  return NextResponse.json({ success: true, plan: record });
}
