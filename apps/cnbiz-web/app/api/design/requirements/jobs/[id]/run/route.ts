import { NextResponse } from "next/server";
import { getDesignPlanJob } from "@/lib/design/generationJob";
import { runDesignPlanJob } from "@/lib/design/generationJobWorker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// app/api/design/requirements/route.ts와 동일한 근거(AI 호출 1회가 최대 270초까지 걸릴 수
// 있음, lib/ai/bridge.ts의 LARGE_GENERATION_CHAT_OPTIONS 참고) — 이 라우트가 실제 생성을
// 수행하는 자리를 넘겨받았으므로 동일하게 300초로 맞춘다.
export const maxDuration = 300;

/**
 * app/api/ai-jobs/[id]/run/route.ts와 동일한 패턴 — runDesignPlanJob()은 내부에서 모든 예외를
 * 잡아 Job을 Failed로 기록하고 절대 throw하지 않으므로, 여기서 success는 "요청이 정상
 * 처리됐는가"가 아니라 "Job이 Success로 끝났는가"를 의미한다.
 *
 * 이 요청 자체가 브라우저 쪽에서 끊기더라도(네트워크 끊김 등) 서버는 이미 시작한 처리를 계속
 * 진행한다 — 화면은 이 fetch가 실패해도 GET .../jobs/[id] 폴링으로 최종 결과를 그대로 회수할
 * 수 있다(이번 변경의 핵심 목적).
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const job = await getDesignPlanJob(id);
  if (!job) {
    return NextResponse.json({ success: false, error: "Job을 찾을 수 없습니다." }, { status: 404 });
  }

  if (job.status === "Running") {
    return NextResponse.json({ success: false, error: "이미 실행 중인 Job입니다." }, { status: 400 });
  }

  if (job.status === "Success") {
    return NextResponse.json({ success: false, error: "이미 완료된 Job입니다." }, { status: 400 });
  }

  const updated = await runDesignPlanJob(id);
  return NextResponse.json({ success: updated?.status === "Success", job: updated });
}
