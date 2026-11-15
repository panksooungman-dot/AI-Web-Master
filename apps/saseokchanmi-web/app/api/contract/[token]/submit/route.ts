import { guarded, json, readJson, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";
import { notifySubmission } from "@/lib/contract/server/notify";
import { submitContract } from "@/lib/contract/server/service";

export const dynamic = "force-dynamic";

/** 근로자 서명 제출. 계약 조건은 서버가 저장된 설정에서 스냅샷으로 만들고, 서명 시각도 서버 시각을 쓴다. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return guarded(async () => {
    const blocked = requireSameOrigin(request);
    if (blocked) return blocked;
    const { token } = await params;
    const body = await readJson(request, 400_000);
    if (!body.ok) return body.response;
    const result = await submitContract(getStore(), token, body.body);
    if (result.status === 201) {
      // 서명은 이미 저장됐다. 알림이 실패해도 제출 결과에는 영향이 없고, 실패 사유만 서버 로그에 남긴다(개인정보 제외).
      const name = String((body.body as Record<string, unknown>).name ?? "");
      const sent = await notifySubmission(name);
      for (const r of sent) if (!r.ok) console.error(`[contract-notify] ${r.channel} 실패: ${r.error}`);
    }
    return json(result.body, result.status);
  });
}
