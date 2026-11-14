import { fail, guarded, json } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";
import { effectiveConfig, loadSettings } from "@/lib/contract/server/service";

export const dynamic = "force-dynamic";

/**
 * 근로자용: 링크 토큰으로 계약 내용을 가져온다. 로그인은 필요 없고 추측할 수 없는 토큰이 접근 권한이다.
 * 이미 제출된 계약이면 내용을 돌려주지 않는다(재서명 불가). 관리자용 메모(label)는 내보내지 않는다.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  return guarded(async () => {
    const { token } = await params;
    const store = getStore();
    const rec = await store.getConfig(token);
    if (!rec) return fail(404, "계약서 링크를 확인해 주세요.");
    if (await store.getSubmissionByToken(token)) return json({ ok: true, state: "submitted" });
    const settings = await loadSettings(store);
    return json({ ok: true, state: "open", config: { ...effectiveConfig(settings, rec), label: "" } });
  });
}
