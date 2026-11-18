import { fail, guarded, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { alimtalkMissing, contractLink, mobileOf, sendAlimtalk } from "@/lib/contract/server/alimtalk";
import { getStore } from "@/lib/contract/server/select";
import { safeName } from "@/lib/contract/server/notify";

export const dynamic = "force-dynamic";

/** 직원에게 계약서 작성 링크를 카카오 알림톡으로 보낸다. 직원 번호는 서명 전에는 시스템에 없으므로 보낼 때 사장님이 입력한다(저장하지 않는다). */
export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const body = await readJson(request, 2_000);
    if (!body.ok) return body.response;
    const b = (body.body ?? {}) as Record<string, unknown>;
    const to = mobileOf(String(b.phone ?? ""));
    if (!to) return fail(400, "직원 휴대전화 번호를 정확히 입력해 주세요.");
    const missing = alimtalkMissing("contract");
    if (missing.length) return fail(503, `알림톡이 아직 설정되지 않았습니다. (${missing.join(", ")})`);
    const { token } = await ctx.params;
    const rec = await getStore().getConfig(token);
    if (!rec) return fail(404, "직원 계약을 찾을 수 없습니다.");
    const name = safeName(String(b.name ?? "") || rec.config.label || "");
    const r = await sendAlimtalk("contract", { to, vars: { 이름: name }, link: contractLink(token) });
    return r.ok ? json({ ok: true }) : fail(502, r.error ?? "알림톡을 보내지 못했습니다.");
  });
}
