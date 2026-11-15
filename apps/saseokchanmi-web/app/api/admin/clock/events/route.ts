import { addEvent } from "@/lib/contract/server/clock";
import { guarded, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 빠진 출퇴근 기록을 관리자가 직접 추가한다(사유 필수, 이력 기록). */
export async function POST(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const body = await readJson(request, 5000);
    if (!body.ok) return body.response;
    const r = await addEvent(getStore(), body.body);
    return json(r.body, r.status);
  });
}
