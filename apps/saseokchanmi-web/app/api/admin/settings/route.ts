import { parseCompanySettings } from "@/lib/contract";
import { fail, guarded, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";
import { loadSettings } from "@/lib/contract/server/service";

export const dynamic = "force-dynamic";

/** 공통 설정(사업주 정보·서명·워터마크·최저시급) 조회. */
export async function GET(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const s = await loadSettings(getStore());
    return json({ ok: true, company: s.company, minWage: s.minWage });
  });
}

/** 공통 설정 저장. 보낸 항목만 바꾸고 나머지는 유지한다. 이미 제출된 계약서는 서명 당시 내용 그대로 남는다. */
export async function PUT(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const body = await readJson(request, 400_000);
    if (!body.ok) return body.response;
    const parsed = parseCompanySettings(body.body);
    if (!parsed.ok) return fail(400, "입력 내용을 확인해 주세요.", { errors: parsed.errors });
    const store = getStore();
    const cur = await loadSettings(store);
    const { minWage, ...company } = parsed.value;
    const next = { company: { ...cur.company, ...company }, minWage: minWage ?? cur.minWage, updatedAt: new Date().toISOString() };
    await store.putSettings(next);
    return json({ ok: true, company: next.company, minWage: next.minWage });
  });
}
