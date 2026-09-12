import { NextResponse } from "next/server";
import { getWebsiteOrder, addAiJobToWebsiteOrder } from "@/lib/websiteOrders/registry";
import { createAiJob, listAiJobsByWebsiteOrder } from "@/lib/aiJobs/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * "새 AI Job 생성" — 이미 Success로 끝난 WebsiteOrder에 새 AiJob을 추가로 만든다.
 * app/api/inquiries/route.ts가 최초 Inquiry 접수 시 하던 것과 동일한 두 호출
 * (createAiJob + addAiJobToWebsiteOrder)을 그대로 재사용한다 — 새 실행 로직 없음.
 *
 * 왜 필요한가: generated Website의 outDir은 os.tmpdir() 기준(lib/paths/repoRoot.ts)이라
 * Vercel 서버리스 인스턴스가 재활용되면 사라진다. GITHUB_TOKEN/VERCEL_TOKEN을 나중에
 * 설정해도 이미 Success로 끝난 옛 AiJob은 재실행 버튼 자체가 없고(app/api/ai-jobs/[id]/run은
 * Success Job을 거부함), 있어도 outDir이 이미 사라져 배포가 실패한다. 새 AiJob을 만들어 처음부터
 * 다시 생성+배포(lib/aiJobs/worker.ts::processJob → triggerDeployment, 같은 요청 안에서 실행)해야
 * 토큰이 반영된 실제 배포가 성공한다.
 *
 * Queued로만 만들고 여기서 바로 실행하지 않는다 — POST /api/inquiries와 동일하게 관리자가
 * 화면에서 명시적으로 "승인 및 생성"을 눌러야 실행되도록(Rewiring Phase 2 원칙 유지).
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const websiteOrder = await getWebsiteOrder(id);
  if (!websiteOrder) {
    return NextResponse.json({ success: false, error: "WebsiteOrder를 찾을 수 없습니다." }, { status: 404 });
  }

  const existingJobs = await listAiJobsByWebsiteOrder(id);
  const hasPendingJob = existingJobs.some((job) => job.status === "Queued" || job.status === "Running");
  if (hasPendingJob) {
    return NextResponse.json(
      { success: false, error: "이미 대기 중이거나 실행 중인 AI Job이 있습니다." },
      { status: 400 },
    );
  }

  const aiJob = await createAiJob({
    websiteOrderId: websiteOrder.id,
    type: "generate_website",
    payload: { siteType: websiteOrder.siteType, requirements: websiteOrder.requirements },
  });
  await addAiJobToWebsiteOrder(websiteOrder.id, aiJob.id);

  return NextResponse.json({ success: true, aiJob });
}
