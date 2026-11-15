import { guarded, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { confirmPayslip } from "@/lib/contract/server/payroll";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 급여 명세서 확정. 서버가 다시 계산해서 저장하고, 다시 확정하면 차수가 올라간다. */
export async function POST(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const body = await readJson(request);
    if (!body.ok) return body.response;
    const r = await confirmPayslip(getStore(), body.body);
    return json(r.body, r.status);
  });
}
