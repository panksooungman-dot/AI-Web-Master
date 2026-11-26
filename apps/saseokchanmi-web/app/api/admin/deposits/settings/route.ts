import { parseExcludeNames } from "@/lib/contract/deposit";
import { fail, guarded, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 입금 확인에서 제외할 입금자명(카드사 정산 등). 기본으로 이름에 "카드"가 들어가면 제외하고, 여기에 적은 이름도 제외한다. */
export async function GET(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const s = await getStore().getDepositSettings();
    return json({ ok: true, excludeNames: s.excludeNames, lastIngestAt: s.lastIngestAt });
  });
}

export async function PUT(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const body = await readJson(request, 4000);
    if (!body.ok) return body.response;
    const parsed = parseExcludeNames((body.body as Record<string, unknown> | null)?.excludeNames);
    if (!parsed.ok) return fail(400, parsed.error);
    await getStore().putDepositExcludes(parsed.value);
    return json({ ok: true, excludeNames: parsed.value });
  });
}
