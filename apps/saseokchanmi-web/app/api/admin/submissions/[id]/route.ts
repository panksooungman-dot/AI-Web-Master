import { fmtPhone, validateWorkerInfo } from "@/lib/contract";
import { fail, guarded, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";
import { isOwnerSigned } from "@/lib/contract/server/status";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** 제출 한 건 전체(서명 당시 계약 설정 스냅샷 포함). 화면에는 이 스냅샷으로 계약서를 그려야 한다. */
export async function GET(request: Request, { params }: Ctx) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const { id } = await params;
    const sub = await getStore().getSubmission(id);
    return sub ? json({ ok: true, submission: sub, ownerSigned: isOwnerSigned(sub) }) : fail(404, "제출 내역을 찾을 수 없습니다.");
  });
}

/** 근로자 정보 수정: 성명·연락처·주소만 바꿀 수 있다. 서명과 계약 조건은 서명 후 바꾸지 못한다. */
export async function PATCH(request: Request, { params }: Ctx) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const { id } = await params;
    const body = await readJson(request, 5_000);
    if (!body.ok) return body.response;
    const b = (body.body ?? {}) as Record<string, unknown>;
    const info = { name: String(b.name ?? ""), phone: String(b.phone ?? ""), address: String(b.address ?? "") };
    const v = validateWorkerInfo(info);
    if (!v.ok) return fail(400, "입력 내용을 확인해 주세요.", { fields: v.errors });
    const next = await getStore().updateSubmission(id, {
      name: info.name.trim(),
      phone: fmtPhone(info.phone),
      address: info.address.trim(),
      editedAt: new Date().toISOString(),
    });
    return next ? json({ ok: true, submission: next }) : fail(404, "제출 내역을 찾을 수 없습니다.");
  });
}

export async function DELETE(request: Request, { params }: Ctx) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const { id } = await params;
    return (await getStore().deleteSubmission(id)) ? json({ ok: true }) : fail(404, "제출 내역을 찾을 수 없습니다.");
  });
}
