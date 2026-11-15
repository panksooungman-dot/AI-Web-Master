import { timingSafeEqual } from "node:crypto";
import { runMissingCheckoutAlert } from "@/lib/contract/server/clock-alert";
import { fail, guarded, json } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** Vercel Cron이 "Authorization: Bearer <CRON_SECRET>"로 호출한다. 비밀값이 없거나 틀리면 아무것도 하지 않는다. */
function authorized(request: Request): boolean | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** 퇴근 기록이 빠진 직원이 있으면 사업주에게 알린다. */
export async function GET(request: Request) {
  return guarded(async () => {
    const ok = authorized(request);
    if (ok === null) return fail(503, "CRON_SECRET이 설정되지 않았습니다.");
    if (!ok) return fail(401, "허용되지 않은 요청입니다.");
    const r = await runMissingCheckoutAlert(getStore());
    return json({ ok: true, count: r.count, sent: r.sent.map((x) => ({ channel: x.channel, ok: x.ok })) });
  });
}
