import { NextResponse } from "next/server";
import { listAiJobs } from "@/lib/aiJobs/registry";
import { processQueuedJobs } from "@/lib/aiJobs/worker";

/**
 * Queued 상태인 모든 AiJob을 일괄 실행한다. 자동 실행(Inquiry 생성 시, app/api/external/
 * inquiries/route.ts)이나 개별 재시도(/api/ai-jobs/[id]/run)로 커버되지 않는 적체분(예:
 * 이 연결부가 생기기 전에 이미 Queued로 남아있던 과거 Job)을 관리자가 한 번에 처리할 수
 * 있는 수동 트리거. 새 큐·새 스케줄러를 만들지 않고 기존 lib/aiJobs/worker.ts의
 * processQueuedJobs()를 그대로 호출한다.
 */
export async function POST() {
  const before = await listAiJobs();
  const queuedIds = new Set(before.filter((job) => job.status === "Queued").map((job) => job.id));

  if (queuedIds.size === 0) {
    return NextResponse.json({ success: true, processed: 0, aiJobs: [], message: "실행 대기 중인 Job이 없습니다." });
  }

  await processQueuedJobs();

  const after = await listAiJobs();
  const processedJobs = after.filter((job) => queuedIds.has(job.id));

  return NextResponse.json({ success: true, processed: processedJobs.length, aiJobs: processedJobs });
}
