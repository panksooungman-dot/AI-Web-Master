import { NextResponse } from "next/server";
import { generateDesignPlan } from "@/lib/design/generator";
import { createDesignPlan, listDesignPlans } from "@/lib/design/registry";
import type { DesignPlanInput } from "@/lib/design/types";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

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
 * Phase 1 산출물 5종(Requirement Analysis/Feature List/Site Map/User Flow/Screen List)을
 * 한 번에 생성한다 — 문서의 "Dashboard Integration"(11번)도 5종을 "Requirements" 메뉴 하나로
 * 묶어 보여주므로, 별도 API를 5개로 쪼개지 않고 하나로 통합했다.
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
