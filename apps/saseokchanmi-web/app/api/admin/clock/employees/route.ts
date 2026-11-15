import { adminEmployees, recentEvents } from "@/lib/contract/server/clock";
import { guarded, json, requireAdmin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 출퇴근 대상 직원(확정된 계약)과 PIN 발급 여부, 최근 7일 기록. */
export async function GET(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const store = getStore();
    const [employees, events] = await Promise.all([adminEmployees(store), recentEvents(store)]);
    return json({ ok: true, employees, events });
  });
}
