import { isValidSignature } from "@/lib/contract";
import { fail, guarded, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";
import { isOwnerSigned } from "@/lib/contract/server/status";

export const dynamic = "force-dynamic";

/** 사업주 개별 서명(공통 서명이 없을 때). 서명하면 확정 상태가 된다. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const { id } = await params;
    const body = await readJson(request, 400_000);
    if (!body.ok) return body.response;
    const sig = (body.body as { ownerSig?: unknown } | null)?.ownerSig;
    if (!isValidSignature(sig)) return fail(400, "서명 이미지가 올바르지 않습니다.");
    const store = getStore();
    const sub = await store.getSubmission(id);
    if (!sub) return fail(404, "제출 내역을 찾을 수 없습니다.");
    if (isOwnerSigned(sub)) return fail(409, "이미 사업주 서명이 들어 있습니다.");
    const next = await store.updateSubmission(id, { ownerSig: sig as string, countersignedAt: new Date().toISOString() });
    return json({ ok: true, submission: next });
  });
}
