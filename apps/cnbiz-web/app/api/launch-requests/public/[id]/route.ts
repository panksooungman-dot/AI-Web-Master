import { NextResponse } from "next/server";
import { getLaunchRequest } from "@/lib/launchRequests/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 공개 조회 전용(RBAC 비로그인, lib/auth/rbac.ts의 UNGATED_API_PREFIXES "/api/launch-requests/public"
 * 참고) — 의뢰자가 링크로 여는 app/launch-request/[id]/page.tsx가 사용한다. companyName·선택된
 * 서비스 id·필수 여부만 반환하며, 카탈로그의 안내 문구(이름·필드·발급 절차)는 민감정보가 아니라
 * lib/launchRequests/catalog.ts를 클라이언트에서 그대로 import해 렌더링한다 — 응답에는 중복 포함하지
 * 않는다. 의뢰자가 실제로 입력하는 API 키 값은 이 라우트를 거치지 않는다(서버 저장 안 함).
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const launchRequest = await getLaunchRequest(id);

  if (!launchRequest) {
    return NextResponse.json({ error: "정보 요청서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    launchRequest: {
      id: launchRequest.id,
      companyName: launchRequest.companyName,
      services: launchRequest.services,
      createdAt: launchRequest.createdAt,
    },
  });
}
