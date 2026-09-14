import { NextResponse } from "next/server";
import { createPrototypeJob } from "@/lib/design/prototypeJob";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * app/api/design/requirements/jobs/route.ts와 동일한 패턴 — Job만 만들고 즉시 응답한다. 실제
 * 생성은 POST .../jobs/[id]/run이 별도로 수행한다.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const wireframeId = isRecord(body) && typeof body.wireframeId === "string" ? body.wireframeId.trim() : "";

  if (!wireframeId) {
    return NextResponse.json({ success: false, error: "wireframeId는 필수입니다." }, { status: 400 });
  }

  const job = await createPrototypeJob({ wireframeId });
  return NextResponse.json({ success: true, job });
}
