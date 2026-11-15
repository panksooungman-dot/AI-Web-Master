import { isClockDevice, punch } from "@/lib/contract/server/clock";
import { fail, guarded, json, readJson, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 출근·퇴근 기록. 등록된 기기에서, 직원 PIN이 맞을 때만 서버 시각으로 저장한다. */
export async function POST(request: Request) {
  return guarded(async () => {
    const blocked = requireSameOrigin(request);
    if (blocked) return blocked;
    if (!isClockDevice(request)) return fail(403, "등록된 출퇴근 기기가 아닙니다.", { code: "no-device" });
    const body = await readJson(request, 2000);
    if (!body.ok) return body.response;
    const r = await punch(getStore(), body.body);
    return json(r.body, r.status);
  });
}
