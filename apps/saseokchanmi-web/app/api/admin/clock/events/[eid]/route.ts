import { editEvent, removeEvent } from "@/lib/contract/server/clock";
import { guarded, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eid: string }> };

/** 출퇴근 기록 정정(시각·구분). 사유 필수, 정정 전 내용이 이력에 남는다. */
export async function PATCH(request: Request, { params }: Ctx) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const body = await readJson(request, 5000);
    if (!body.ok) return body.response;
    const { eid } = await params;
    const r = await editEvent(getStore(), eid, body.body);
    return json(r.body, r.status);
  });
}

/** 출퇴근 기록 삭제. 사유 필수, 삭제한 내용이 이력에 남는다. */
export async function DELETE(request: Request, { params }: Ctx) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const body = await readJson(request, 5000);
    if (!body.ok) return body.response;
    const { eid } = await params;
    const r = await removeEvent(getStore(), eid, body.body);
    return json(r.body, r.status);
  });
}
