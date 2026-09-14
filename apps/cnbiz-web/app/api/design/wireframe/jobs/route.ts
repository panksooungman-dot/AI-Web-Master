import { NextResponse } from "next/server";
import { createWireframeJob } from "@/lib/design/wireframeJob";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * app/api/design/requirements/jobs/route.ts와 동일한 패턴 — Job만 만들고 즉시 응답한다. 실제
 * 생성은 POST .../jobs/[id]/run이 별도로 수행한다. 기존 POST /api/design/wireframe(동기)는
 * app/developer/websites/page.tsx의 "11개 템플릿 자동생성" 위저드가 그대로 사용 중이라 계약을
 * 바꾸지 않는다.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const storyboardId = isRecord(body) && typeof body.storyboardId === "string" ? body.storyboardId.trim() : "";

  if (!storyboardId) {
    return NextResponse.json({ success: false, error: "storyboardId는 필수입니다." }, { status: 400 });
  }

  const job = await createWireframeJob({ storyboardId });
  return NextResponse.json({ success: true, job });
}
