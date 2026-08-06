import { NextResponse } from "next/server";
import { generateDesignPlan } from "@/lib/design/generator";
import { createDesignPlan, listDesignPlans } from "@/lib/design/registry";
import type { DesignPlanInput } from "@/lib/design/types";
import { getInquiry } from "@/lib/inquiries/registry";
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

  let projectName = str(body, "projectName");
  let projectType = str(body, "projectType");
  let requirements = str(body, "requirements");
  let targetUsers = str(body, "targetUsers");
  const projectId = str(body, "projectId") || undefined;
  const inquiryId = str(body, "inquiryId") || undefined;

  // Inquiry → Design Bridge. `inquiryId`가 오면 기존 InquiryRecord(+ 이미 자동 생성되어 있는
  // inquiry.analysis)에서 DesignPlanInput 4개 필드를 채운다 — Estimate/Specification/Timeline/
  // Contract/Proposal 라우트가 전부 `{inquiryId}`만 받아 상위 레코드를 스스로 조회하는 것과
  // 동일한 방식이다. 명시적으로 넘어온 필드가 항상 우선하고, inquiryId가 없으면 아래 로직은
  // 전혀 실행되지 않으므로 기존 직접 입력 경로의 동작은 100% 그대로다.
  if (inquiryId) {
    const inquiry = await getInquiry(inquiryId);

    if (!inquiry) {
      return NextResponse.json({ success: false, error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
    }

    projectName = projectName || inquiry.companyName || inquiry.contactName;
    // detectedBusinessType은 AI Analysis Engine 산출물, siteType은 접수 시 원본 — 앞의 것이 없으면 뒤로 폴백.
    projectType = projectType || inquiry.analysis?.detectedBusinessType || inquiry.siteType;
    requirements = requirements || inquiry.requirements;
    // InquiryInput에는 "대상 사용자" 전용 필드가 없다 — 가장 가까운 기존 필드인 industry를 쓰고,
    // 그마저 없으면 빈 문자열로 둔다(generateDesignPlan()이 빈 값을 이미 허용한다).
    targetUsers = targetUsers || inquiry.industry || "";
  }

  if (!projectName || !requirements) {
    return NextResponse.json(
      { success: false, error: "projectName·requirements는 필수입니다." },
      { status: 400 }
    );
  }

  const input: DesignPlanInput = { projectName, projectType, requirements, targetUsers, projectId, inquiryId };

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
