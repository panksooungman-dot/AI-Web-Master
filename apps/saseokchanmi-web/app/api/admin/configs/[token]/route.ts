import { buildConfig, checkConfig, parseWorkerConfig } from "@/lib/contract";
import { fail, guarded, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";
import { effectiveConfig, loadSettings } from "@/lib/contract/server/service";
import { contractStatus, STATUS_LABEL } from "@/lib/contract/server/status";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Ctx) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const { token } = await params;
    const store = getStore();
    const rec = await store.getConfig(token);
    if (!rec) return fail(404, "직원 계약을 찾을 수 없습니다.");
    const settings = await loadSettings(store);
    const effective = effectiveConfig(settings, rec);
    const sub = await store.getSubmissionByToken(token);
    const status = contractStatus(rec, sub);
    return json({ ok: true, record: rec, config: effective, minWage: settings.minWage, warnings: checkConfig(effective).warnings, status, statusLabel: STATUS_LABEL[status], submissionId: sub?.id ?? null });
  });
}

/** 직원 계약 수정. 이미 제출된 계약서는 서명 당시 내용 그대로 유지된다. */
export async function PATCH(request: Request, { params }: Ctx) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const { token } = await params;
    const body = await readJson(request, 100_000);
    if (!body.ok) return body.response;
    const parsed = parseWorkerConfig(body.body);
    if (!parsed.ok) return fail(400, "입력 내용을 확인해 주세요.", { errors: parsed.errors });
    const store = getStore();
    const rec = await store.getConfig(token);
    if (!rec) return fail(404, "직원 계약을 찾을 수 없습니다.");
    const settings = await loadSettings(store);
    const merged = { ...rec.config, ...parsed.value };
    const effective = buildConfig(settings.company, merged);
    const check = checkConfig(effective);
    if (check.errors.length) return fail(400, check.errors[0], { errors: check.errors });
    await store.putConfig({ ...rec, config: merged, updatedAt: new Date().toISOString() });
    return json({ ok: true, config: effective, warnings: check.warnings });
  });
}

/** 직원 계약 삭제. 이미 제출된 계약서(제출 건)는 지워지지 않는다. */
export async function DELETE(request: Request, { params }: Ctx) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const { token } = await params;
    return (await getStore().deleteConfig(token)) ? json({ ok: true }) : fail(404, "직원 계약을 찾을 수 없습니다.");
  });
}
