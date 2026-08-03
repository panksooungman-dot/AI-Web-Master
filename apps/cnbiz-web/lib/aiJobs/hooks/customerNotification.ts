import type { PostProcessContext } from "../lifecycle";
import { triggerCustomerNotification } from "@/lib/websites/notify";

/**
 * Lifecycle Extension Point에 등록되는 "고객 URL 자동 전달" Hook. 실제 도메인 로직
 * (이메일 발송·Audit Log 기록)은 lib/websites/notify.ts에 있다 — 이 파일은 그 로직을
 * PostProcessHookRun 시그니처에 맞춰 연결하는 얇은 어댑터일 뿐이다.
 */
export async function runCustomerNotificationHook(context: PostProcessContext): Promise<void> {
  await triggerCustomerNotification(context.jobId, undefined, context.store);
}
