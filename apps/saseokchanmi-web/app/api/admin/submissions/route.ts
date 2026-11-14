import { guarded, json, requireAdmin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";
import { isOwnerSigned } from "@/lib/contract/server/status";

export const dynamic = "force-dynamic";

/** 제출 현황 목록. 서명 이미지 등 큰 데이터는 빼고 요약만 돌려준다. */
export async function GET(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const store = getStore();
    const [subs, configs] = await Promise.all([store.listSubmissions(), store.listConfigs()]);
    const labels = new Map(configs.map((c) => [c.token, c.config.label ?? ""]));
    return json({
      ok: true,
      items: subs.map((s) => ({
        id: s.id,
        configToken: s.configToken,
        label: labels.get(s.configToken) ?? "",
        name: s.name,
        phone: s.phone,
        type: s.configSnapshot.type,
        signedAt: s.signedAt,
        ownerSigned: isOwnerSigned(s),
        hasInsForm: !!s.insForm,
        editedAt: s.editedAt,
      })),
    });
  });
}
