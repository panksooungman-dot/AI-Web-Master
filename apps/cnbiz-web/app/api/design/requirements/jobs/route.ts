import { NextResponse } from "next/server";
import { createDesignPlanJob } from "@/lib/design/generationJob";
import type { DesignPlanInput } from "@/lib/design/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? (body[key] as string).trim() : "";
}

/**
 * app/api/design/requirements/route.ts의 검증 로직과 동일하다(의도적 중복 — 그 라우트는
 * app/developer/websites/page.tsx의 자동생성 위저드가 이미 쓰고 있어 계약을 바꾸지 않는다).
 * 여기는 Job만 만들고 즉시 응답한다 — 실제 AI 생성은 POST .../jobs/[id]/run이 별도로 수행한다.
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
  const job = await createDesignPlanJob(input);

  return NextResponse.json({ success: true, job });
}
