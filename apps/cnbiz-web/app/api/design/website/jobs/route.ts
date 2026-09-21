import { NextResponse } from "next/server";
import { createWebsiteBuildJob } from "@/lib/design/websiteBuildJob";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * app/api/design/storyboard/jobs/route.ts와 동일한 패턴 — Job만 만들고 즉시 응답한다. 실제
 * 생성·배포는 POST .../jobs/[id]/run이 별도로 수행한다. 기존 POST /api/design/website(동기)는
 * 계약을 바꾸지 않는다.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const reviewId = isRecord(body) && typeof body.reviewId === "string" ? body.reviewId.trim() : "";
  const outDirInput = isRecord(body) && typeof body.outDir === "string" ? body.outDir.trim() : "";

  if (!reviewId) {
    return NextResponse.json({ success: false, error: "reviewId는 필수입니다." }, { status: 400 });
  }

  const job = await createWebsiteBuildJob({ reviewId, outDir: outDirInput || undefined });
  return NextResponse.json({ success: true, job });
}
