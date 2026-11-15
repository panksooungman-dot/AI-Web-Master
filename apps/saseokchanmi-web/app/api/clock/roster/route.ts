import { isClockDevice, roster } from "@/lib/contract/server/clock";
import { fail, guarded, json } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 출퇴근 기기 화면의 직원 목록(이름·현재 상태). 등록된 기기에서만 내려 준다. */
export async function GET(request: Request) {
  return guarded(async () => {
    if (!isClockDevice(request)) return fail(403, "등록된 출퇴근 기기가 아닙니다. 사장님이 관리자 화면에서 이 기기를 등록해야 합니다.", { code: "no-device" });
    return json({ ok: true, employees: await roster(getStore()) });
  });
}
