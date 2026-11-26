import { clientKey, fail, guarded, json, loginLockSeconds, recordLoginFailure } from "@/lib/contract/server/http";
import { ingestAuth, ingestDepositSms, readSmsText } from "@/lib/contract/server/deposits";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/**
 * 사장님 폰이 받은 은행 입금 문자를 보내는 곳. 폰의 자동화 앱이 호출한다(브라우저가 아니므로 같은 출처 검사를 하지 않고, 비밀 키로 확인한다).
 * 본문은 문자 내용 그대로(text/plain) 또는 {"text": "..."} JSON. 비밀 키는 Authorization: Bearer <키> 또는 x-deposit-secret 헤더.
 * 키를 5번 틀리면 15분간 잠근다.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    const ok = ingestAuth(request);
    if (ok === null) return fail(503, "입금 문자 받기가 아직 설정되지 않았습니다. (DEPOSIT_INGEST_SECRET)");
    const store = getStore();
    const key = "deposit-" + clientKey(request);
    const locked = await loginLockSeconds(store, key);
    if (locked > 0) return fail(429, `잠시 후 다시 시도해 주세요. (${Math.ceil(locked / 60)}분)`);
    if (!ok) {
      await recordLoginFailure(store, key);
      return fail(401, "허용되지 않은 요청입니다.");
    }
    const body = await readSmsText(request);
    if (!body.ok) return body.response;
    const r = await ingestDepositSms(store, body.text);
    return json(r.body, r.status);
  });
}
