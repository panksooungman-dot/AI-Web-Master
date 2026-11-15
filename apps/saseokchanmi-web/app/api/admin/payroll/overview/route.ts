import { guarded, json, requireAdmin } from "@/lib/contract/server/http";
import { payrollOverview } from "@/lib/contract/server/payroll";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 이 달 전 직원 급여 현황(?month=YYYY-MM). */
export async function GET(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const r = await payrollOverview(getStore(), new URL(request.url).searchParams.get("month") ?? "");
    return json(r.body, r.status);
  });
}
