import { NextResponse } from "next/server";
import { getStoryboardJob } from "@/lib/design/storyboardJob";
import { getStoryboard } from "@/lib/design/storyboard";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** 화면이 몇 초 간격으로 호출하는 폴링 엔드포인트. Success면 결과를 다시 조회할 필요 없도록 storyboard를 함께 내려준다. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const job = await getStoryboardJob(id);

  if (!job) {
    return NextResponse.json({ success: false, error: "Job을 찾을 수 없습니다." }, { status: 404 });
  }

  const storyboard = job.resultId ? await getStoryboard(job.resultId) : null;

  return NextResponse.json({ success: true, job, storyboard });
}
