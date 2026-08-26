import { randomBytes, createHmac } from "node:crypto";

/**
 * SOLAPI(https://solapi.com, NURIGO) 문자(SMS/LMS) 발송 — 관리자 알림 이메일·Slack과 병행하는
 * 세 번째 채널. 사용자가 이미 SOLAPI를 사용 중이라고 확인해 추가.
 *
 * API 스펙(엔드포인트·인증 서명 방식·요청/응답 스키마)은 이 샌드박스에서 solapi.com 공식 문서
 * 도메인(docs.solapi.com, developers.solapi.dev)이 전부 접근 차단(EGRESS_BLOCKED/DNS 실패)되어
 * 추측 대신 SOLAPI가 공식 배포하는 오픈소스 SDK(github.com/solapi/solapi-nodejs, npm
 * `solapi` 패키지)의 실제 소스코드를 직접 읽어 확인했다 — Base URL
 * `https://api.solapi.com`, 발송 엔드포인트 `POST /messages/v4/send-many/detail`, 인증은
 * `Authorization: HMAC-SHA256 apiKey=..., date=..., salt=..., signature=...` 헤더(signature는
 * `HMAC-SHA256(key=apiSecret, message=date+salt)`의 hex digest).
 *
 * 이 프로젝트는 SDK 전체(effect 라이브러리 기반, 재시도·스키마 검증 등)를 새 의존성으로 추가할
 * 필요가 없어 `lib/contact/email/providers/resend.ts`·`lib/inquiries/slack.ts`와 동일한
 * "fetch 하나로 직접 호출" 패턴으로 최소 구현했다.
 */

export interface SolapiNotifier {
  send(text: string): Promise<void>;
}

const SALT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateSalt(length = 32): string {
  const bytes = randomBytes(length);
  let salt = "";
  for (let i = 0; i < length; i += 1) {
    salt += SALT_ALPHABET[bytes[i] % SALT_ALPHABET.length];
  }
  return salt;
}

function buildAuthorizationHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = generateSalt();
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export function createSolapiNotifier(
  apiKey: string,
  apiSecret: string,
  to: string,
  from: string
): SolapiNotifier {
  return {
    async send(text: string) {
      const res = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
        method: "POST",
        headers: {
          Authorization: buildAuthorizationHeader(apiKey, apiSecret),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ to, from, text }],
        }),
      });

      const body = await res.text();

      if (!res.ok) {
        throw new Error(`SOLAPI error (${res.status}): ${body}`);
      }

      // SOLAPI는 배치 발송 응답이라 2xx여도 개별 메시지가 실패할 수 있다 — 공식 SDK(messageService.ts)와
      // 동일하게 "전체(1건) 실패"만 오류로 취급한다(부분 실패 개념이 없는 단건 발송이라 곧 전체 실패).
      let parsed: { failedMessageList?: unknown[]; groupInfo?: { count?: { total?: number; registeredFailed?: number } } };
      try {
        parsed = JSON.parse(body) as typeof parsed;
      } catch {
        return;
      }
      const failedList = parsed.failedMessageList ?? [];
      const count = parsed.groupInfo?.count;
      const failedAll = failedList.length > 0 && count?.total !== undefined && count.total === count.registeredFailed;
      if (failedAll) {
        throw new Error(`SOLAPI message not received: ${JSON.stringify(failedList)}`);
      }
    },
  };
}
