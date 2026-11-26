import { guarded, fail, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { loadPayrollSettings, parsePayrollSettings } from "@/lib/contract/server/payroll";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 급여 설정(공제율·휴게시간 차감) 조회. */
export async function GET(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const s = await loadPayrollSettings(getStore());
    return json({ ok: true, rates: s.rates, autoRates: s.autoRates !== false, deductBreak: s.deductBreak });
  });
}

/** 급여 설정 저장. 보낸 항목만 바꾼다. 이미 확정된 명세서는 바뀌지 않는다. */
export async function PUT(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const body = await readJson(request);
    if (!body.ok) return body.response;
    const store = getStore();
    const cur = await loadPayrollSettings(store);
    const parsed = parsePayrollSettings(body.body, cur);
    if (!parsed.ok) return fail(400, parsed.error);
    await store.putPayrollSettings({ ...parsed.value, updatedAt: new Date().toISOString() });
    return json({ ok: true, rates: parsed.value.rates, autoRates: parsed.value.autoRates, deductBreak: parsed.value.deductBreak });
  });
}
