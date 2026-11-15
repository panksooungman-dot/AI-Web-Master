import { buildBackup } from "@/lib/contract/server/backup";
import { guarded, requireAdmin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 전체 데이터 백업(JSON 파일로 내려받기). 관리자만. */
export async function GET(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const now = new Date();
    const backup = await buildBackup(getStore(), now);
    const day = new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10); // 한국 날짜
    return new Response(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="saseokchanmi-backup-${day}.json"`,
        "cache-control": "no-store",
      },
    });
  });
}
