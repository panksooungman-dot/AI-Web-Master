import { guarded, json, readJson, requireSameOrigin } from "@/lib/contract/server/http";
import { getStore } from "@/lib/contract/server/select";
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
    return json(result.body, result.status);
  });
}
