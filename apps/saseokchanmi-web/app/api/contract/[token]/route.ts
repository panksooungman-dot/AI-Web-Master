import { fail, guarded, json } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";
import { effectiveConfig, loadSettings } from "@/lib/contract/server/service";

export const dynamic = "force-dynamic";

/**
 * 근로자용: 링크 토큰으로 계약 내용을 가져온다. 로그인은 필요 없고 추측할 수 없는 토큰이 접근 권한이다.
 * 이미 제출된 계약이면 내용을 돌려주지 않는다(재서명 불가). 관리자용 메모(label)는 내보내지 않는다.
 * 사업주 서명 이미지(ownerSig)도 내보내지 않는다 — 링크만 아는 사람이 서명 이미지를 가져가지 못하게 하고,
 * 서명한 근로자에게는 제출 응답(완료본)에서만 돌려준다. 서명 등록 여부만 `hasOwnerSig`로 알려 준다.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  return guarded(async () => {
    const { token } = await params;
    const store = getStore();
    const rec = await store.getConfig(token);
    if (!rec) return fail(404, "계약서 링크를 확인해 주세요.");
    if (await store.getSubmissionByToken(token)) return json({ ok: true, state: "submitted" });
    const settings = await loadSettings(store);
    const config = { ...effectiveConfig(settings, rec), label: "", ownerSig: "" };
    return json({ ok: true, state: "open", config, hasOwnerSig: !!settings.company.ownerSig });
  });
}
