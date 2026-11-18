import { fail, guarded, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { alimtalkMissing, mobileOf, sendAlimtalk } from "@/lib/contract/server/alimtalk";
import { getStore } from "@/lib/contract/server/select";
import { isMonth, monthLabel } from "@/lib/contract/clock-sheet";
import { safeName } from "@/lib/contract/server/notify";
import { SITE_URL } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/** 확정된 급여명세서가 있는 직원에게 "명세서가 확정되었다"는 안내를 알림톡으로 보낸다. 금액은 보내지 않는다. 번호는 직원이 계약서에 적은 휴대전화를 쓴다. */
export async function POST(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const body = await readJson(request, 2_000);
    if (!body.ok) return body.response;
    const b = (body.body ?? {}) as Record<string, unknown>;
    const id = String(b.id ?? "");
    const month = String(b.month ?? "");
    if (!id || !isMonth(month)) return fail(400, "직원과 귀속 월을 확인해 주세요.");
    const missing = alimtalkMissing("payslip");
    if (missing.length) return fail(503, `알림톡이 아직 설정되지 않았습니다. (${missing.join(", ")})`);
    const store = getStore();
    const [slip, sub] = await Promise.all([store.getPayslip(id, month), store.getSubmission(id)]);
    if (!slip || !sub) return fail(404, "확정된 급여명세서를 찾을 수 없습니다. 먼저 확정해 주세요.");
    if (!mobileOf(sub.phone)) return fail(400, "이 직원의 휴대전화 번호가 올바르지 않아 보낼 수 없습니다.");
    const r = await sendAlimtalk("payslip", { to: sub.phone, vars: { 이름: safeName(sub.name), 귀속월: monthLabel(month), 지급일: slip.payDate }, link: SITE_URL });
    return r.ok ? json({ ok: true }) : fail(502, r.error ?? "알림톡을 보내지 못했습니다.");
  });
}
