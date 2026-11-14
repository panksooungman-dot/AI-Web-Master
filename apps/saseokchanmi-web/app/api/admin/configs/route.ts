import { buildConfig, checkConfig, parseWorkerConfig } from "@/lib/contract";
import { fail, guarded, json, readJson, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";
import { effectiveConfig, loadSettings, newToken } from "@/lib/contract/server/service";
import { contractStatus, STATUS_LABEL } from "@/lib/contract/server/status";

export const dynamic = "force-dynamic";

/** 직원 계약 목록 (이름, 고용형태, 만든 날짜, 상태). */
export async function GET(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const store = getStore();
    const [configs, subs, settings] = await Promise.all([store.listConfigs(), store.listSubmissions(), loadSettings(store)]);
    const byToken = new Map(subs.map((s) => [s.configToken, s]));
    return json({
      ok: true,
      items: configs.map((rec) => {
        const sub = byToken.get(rec.token) ?? null;
        const status = contractStatus(rec, sub);
        const effective = effectiveConfig(settings, rec);
        return {
          token: rec.token,
          label: rec.config.label ?? "",
          type: effective.type,
          createdAt: rec.createdAt,
          status,
          statusLabel: STATUS_LABEL[status],
          submissionId: sub?.id ?? null,
          warnings: checkConfig(effective).warnings,
        };
      }),
    });
  });
}

/** 직원 계약 만들기. 저장하면 근로자용 링크 경로(`/contract/토큰`)가 발급된다. */
export async function POST(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const body = await readJson(request, 100_000);
    if (!body.ok) return body.response;
    const parsed = parseWorkerConfig(body.body);
    if (!parsed.ok) return fail(400, "입력 내용을 확인해 주세요.", { errors: parsed.errors });
    const store = getStore();
    const settings = await loadSettings(store);
    const effective = buildConfig(settings.company, parsed.value);
    const check = checkConfig(effective);
    if (check.errors.length) return fail(400, check.errors[0], { errors: check.errors });
    const now = new Date().toISOString();
    const rec = { token: newToken(), config: parsed.value, createdAt: now, updatedAt: now };
    await store.putConfig(rec);
    return json({ ok: true, token: rec.token, path: `/contract/${rec.token}`, config: effective, warnings: check.warnings }, 201);
  });
}
