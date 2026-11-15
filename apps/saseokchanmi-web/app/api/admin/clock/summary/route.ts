import { summaryData } from "@/lib/contract/server/clock";
import { guarded, json, requireAdmin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 전 직원 월간 요약 데이터(?month=YYYY-MM). */
export async function GET(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const r = await summaryData(getStore(), new URL(request.url).searchParams.get("month") ?? "");
    return json(r.body, r.status);
  });
}
