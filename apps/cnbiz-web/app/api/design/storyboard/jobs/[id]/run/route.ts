import { NextResponse } from "next/server";
import { getStoryboardJob } from "@/lib/design/storyboardJob";
import { runStoryboardJob } from "@/lib/design/storyboardJobWorker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// app/api/design/storyboard/route.ts와 동일한 근거 — 이 라우트가 실제 생성을 수행하는 자리를
// 넘겨받았으므로 동일하게 300초로 맞춘다.
export const maxDuration = 300;

/**
 * app/api/design/requirements/jobs/[id]/run/route.ts와 동일한 패턴 — runStoryboardJob()은
 * 내부에서 모든 예외를 잡아 Job을 Failed로 기록하고 절대 throw하지 않으므로, success는
 * "요청이 정상 처리됐는가"가 아니라 "Job이 Success로 끝났는가"를 의미한다. 이 요청 자체가
 * 브라우저 쪽에서 끊기더라도 서버는 이미 시작한 처리를 계속 진행한다.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const job = await getStoryboardJob(id);
  if (!job) {
    return NextResponse.json({ success: false, error: "Job을 찾을 수 없습니다." }, { status: 404 });
  }

  if (job.status === "Running") {
    return NextResponse.json({ success: false, error: "이미 실행 중인 Job입니다." }, { status: 400 });
  }

  if (job.status === "Success") {
    return NextResponse.json({ success: false, error: "이미 완료된 Job입니다." }, { status: 400 });
  }

  const updated = await runStoryboardJob(id);
  return NextResponse.json({ success: updated?.status === "Success", job: updated });
}
