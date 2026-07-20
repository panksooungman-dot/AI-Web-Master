import { NextResponse } from "next/server";
import { getAiJob, updateAiJobStatus } from "@/lib/aiJobs/registry";
import { AI_JOB_STATUSES, type AiJobStatus } from "@/lib/aiJobs/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isAiJobStatus(value: unknown): value is AiJobStatus {
  return typeof value === "string" && (AI_JOB_STATUSES as string[]).includes(value);
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getAiJob(id);

  if (!record) {
    return NextResponse.json({ error: "Job을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ aiJob: record });
}

/**
 * status만 수동 변경 가능(예: 관리자가 Cancelled로 정리). progress/result/error는
 * 실행기(lib/aiJobs/worker.ts, POST /api/ai-jobs/[id]/run·/api/ai-jobs/process가 호출)가
 * 채우는 필드라 관리자 PATCH 대상에 포함하지 않는다.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const status = typeof body === "object" && body !== null ? (body as Record<string, unknown>).status : undefined;

  if (!isAiJobStatus(status)) {
    return NextResponse.json(
      { success: false, error: `status는 ${AI_JOB_STATUSES.join(", ")} 중 하나여야 합니다.` },
      { status: 400 },
    );
  }

  const record = await updateAiJobStatus(id, status);

  if (!record) {
    return NextResponse.json({ success: false, error: "Job을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, aiJob: record });
}
