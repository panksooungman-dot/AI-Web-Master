import { NextResponse } from "next/server";
import { getAiJob } from "@/lib/aiJobs/registry";
import { processJob } from "@/lib/aiJobs/worker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * AiJob은 생성 시 자동 실행되지만(app/api/external/inquiries/route.ts), 실패한 Job의 재시도나
 * 그 자동 실행이 어떤 이유로 누락된 Job을 관리자가 수동으로 (재)실행할 수 있도록 하는 연결부.
 * 새 실행 로직을 만들지 않고 기존 lib/aiJobs/worker.ts의 processJob()을 그대로 호출한다.
 *
 * processJob()은 내부에서 모든 예외를 잡아 Job을 Failed로 기록하고 절대 throw하지 않으므로
 * (worker.ts), 여기서 success는 "요청이 정상 처리됐는가"가 아니라 "Job이 Success로
 * 끝났는가"를 의미한다 — Worker 오류는 HTTP 상태가 아니라 aiJob.status/aiJob.error로 드러난다.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const job = await getAiJob(id);
  if (!job) {
    return NextResponse.json({ success: false, error: "Job을 찾을 수 없습니다." }, { status: 404 });
  }

  if (job.status === "Running") {
    return NextResponse.json({ success: false, error: "이미 실행 중인 Job입니다." }, { status: 400 });
  }

  if (job.status === "Success") {
    return NextResponse.json({ success: false, error: "이미 완료된 Job입니다." }, { status: 400 });
  }

  try {
    await processJob(id);
  } catch (error) {
    // processJob()은 정상적으로는 여기까지 예외를 전파하지 않지만(내부 try/catch로 Failed
    // 처리), store I/O 실패 등 예상 밖의 오류에 대비한 방어적 처리.
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Worker 실행 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  const updated = await getAiJob(id);
  return NextResponse.json({ success: updated?.status !== "Failed", aiJob: updated });
}
