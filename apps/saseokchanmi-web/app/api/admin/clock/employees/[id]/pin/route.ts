import { isValidPin, setPin } from "@/lib/contract/server/clock";
import { fail, guarded, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PIN 설정. `{ pin: "1234" }`면 그 값으로, `{ generate: true }`면 무작위 4자리를 만들어 이번 응답에서 한 번만 돌려준다. */
export async function PUT(request: Request, { params }: Ctx) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const body = await readJson(request, 1000);
    if (!body.ok) return body.response;
    const b = (body.body ?? {}) as { pin?: unknown; generate?: unknown };
    if (b.generate !== true && !isValidPin(b.pin)) return fail(400, "PIN은 숫자 4자리여야 합니다.");
    const { id } = await params;
    const r = await setPin(getStore(), id, b.generate === true ? null : (b.pin as string));
    return json(r.body, r.status, { "cache-control": "no-store" });
  });
}

/** PIN 삭제: 기기 화면의 직원 목록에서 빠지고 출퇴근을 찍을 수 없게 된다. 기존 기록은 그대로 남는다. */
export async function DELETE(request: Request, { params }: Ctx) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const { id } = await params;
    return json({ ok: true, deleted: await getStore().deleteClockPin(id) });
  });
}
