import { fail, guarded, json, readJson, requireSameOrigin } from "@/lib/contract/server/http";
import { employeePayslips } from "@/lib/contract/server/payslip-view";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 직원 본인의 확정된 급여명세서 조회. 직원 id와 출퇴근 PIN 4자리가 맞아야 한다(로그인 없음). */
export async function POST(request: Request) {
  return guarded(async () => {
    const blocked = requireSameOrigin(request);
    if (blocked) return blocked;
    const body = await readJson(request, 1000);
    if (!body.ok) return body.response;
    const r = await employeePayslips(getStore(), body.body);
    if (r.status >= 500) return fail(500, "잠시 후 다시 시도해 주세요.");
    return json(r.body, r.status);
  });
}
