import { sheetData } from "@/lib/contract/server/clock";
import { guarded, json, requireAdmin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 직원 한 명의 월간 기록부 데이터(?id=&month=YYYY-MM). */
export async function GET(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const u = new URL(request.url);
    const r = await sheetData(getStore(), u.searchParams.get("id") ?? "", u.searchParams.get("month") ?? "");
    return json(r.body, r.status);
  });
}
