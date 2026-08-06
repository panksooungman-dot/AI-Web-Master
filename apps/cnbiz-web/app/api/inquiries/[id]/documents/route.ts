import { NextResponse } from "next/server";
import { getInquiry } from "@/lib/inquiries/registry";
import { POST as generateEstimateRoute } from "@/app/api/estimates/route";
import { POST as generateSpecificationRoute } from "@/app/api/specifications/route";
import { POST as generateTimelineRoute } from "@/app/api/timeline/route";
import { POST as generateContractRoute } from "@/app/api/contracts/route";
import { POST as generateProposalRoute } from "@/app/api/proposals/route";
import { POST as generateDesignRoute } from "@/app/api/design/requirements/route";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Sequential Orchestrator — 기존 문서 생성 API 6개를 의존 순서대로 한 번에 실행하는 연결부.
 *
 * 이 라우트는 생성 로직을 단 한 줄도 갖지 않는다. 각 단계는 이미 존재하는 라우트 핸들러
 * (app/api/{estimates,specifications,design/requirements,timeline,contracts,proposals}/route.ts)를
 * 그대로 import해서 호출한다 — 그래서 Generator·Registry·Audit Log·Metric·유효성 검사가 전부
 * 각 라우트의 기존 구현으로만 수행되고, 여기서 중복되지 않는다. 기존 라우트는 수정하지 않았고
 * 우회하지도 않는다(관리자가 `/developer/inquiries/[id]`에서 버튼을 하나씩 누르는 기존 경로도
 * 그대로 동작한다 — 이 라우트는 그 순서를 자동화할 뿐이다).
 *
 * 순서는 각 라우트가 실제로 조회하는 상위 레코드에서 그대로 도출된다(코드 근거):
 *   estimate       ← inquiry.analysis
 *   specification  ← inquiry.analysis
 *   design         ← inquiry(+analysis)            (Inquiry → Design Bridge)
 *   timeline       ← listEstimatesByInquiry() + listSpecificationsByInquiry()
 *   contract       ← + listTimelinesByInquiry()
 *   proposal       ← + listContractsByInquiry()
 *
 * 한 단계가 실패해도 나머지를 계속 시도하지 않고 그 지점에서 멈춘다 — 뒤 단계가 앞 단계의
 * 산출물을 입력으로 요구하므로, 계속 진행하면 확실히 실패할 요청을 반복하게 된다.
 */

interface StageOutcome {
  stage: string;
  success: boolean;
  status: number;
  error?: string;
}

/** 기존 라우트 핸들러는 전부 `{ inquiryId }` 본문 하나만 받는다 — 그 형태 그대로 만들어 넘긴다. */
function buildStageRequest(request: Request, inquiryId: string): Request {
  return new Request(new URL(request.url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ inquiryId }),
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const inquiry = await getInquiry(id);
  if (!inquiry) {
    return NextResponse.json({ success: false, error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!inquiry.analysis) {
    return NextResponse.json(
      { success: false, error: "AI 분석이 아직 완료되지 않았습니다. 분석 완료 후 다시 시도하세요." },
      { status: 400 }
    );
  }

  const stages: { stage: string; run: (req: Request) => Promise<Response> }[] = [
    { stage: "estimate", run: generateEstimateRoute },
    { stage: "specification", run: generateSpecificationRoute },
    { stage: "design", run: generateDesignRoute },
    { stage: "timeline", run: generateTimelineRoute },
    { stage: "contract", run: generateContractRoute },
    { stage: "proposal", run: generateProposalRoute },
  ];

  const results: StageOutcome[] = [];

  for (const { stage, run } of stages) {
    const response = await run(buildStageRequest(request, id));
    const payload: unknown = await response.json().catch(() => null);
    const error =
      payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : undefined;

    const outcome: StageOutcome = { stage, success: response.ok, status: response.status, error };
    results.push(outcome);

    if (!outcome.success) {
      return NextResponse.json(
        {
          success: false,
          error: `"${stage}" 단계에서 중단되었습니다: ${error ?? `HTTP ${response.status}`}`,
          results,
        },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ success: true, results }, { status: 200 });
}
