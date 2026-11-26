import { depositBoard, requireDepositViewer, updateDepositState } from "@/lib/contract/server/deposits";
import { guarded, json, readJson, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 입금 내역 조회(포스기 화면·관리자 화면). `?days=1`은 오늘, 최대 31일. 관리자 로그인 또는 등록된 매장 기기만 볼 수 있다. */
export async function GET(request: Request) {
  return guarded(async () => {
    const denied = requireDepositViewer(request);
    if (denied) return denied;
    const r = await depositBoard(getStore(), new URL(request.url).searchParams.get("days"));
    return json(r.body, r.status);
  });
}

/** 입금 확인 표시·메모. */
export async function PATCH(request: Request) {
  return guarded(async () => {
    const denied = requireDepositViewer(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const body = await readJson(request, 2000);
    if (!body.ok) return body.response;
    const r = await updateDepositState(getStore(), body.body);
    return json(r.body, r.status);
  });
}
