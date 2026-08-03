import { registerPostProcessHook } from "../lifecycle";
import { runCustomerNotificationHook } from "./customerNotification";

/**
 * AI Business OS 공식 Lifecycle Extension Point — Hook Registry.
 *
 * 새로운 운영 기능(Slack·Discord·CRM·Billing·QA·유지보수·자동 재배포 등)을 추가할 때는
 * 아래 두 단계만 수행한다.
 *   1. 새 도메인 파일을 만든다(예: lib/notifications/slack.ts).
 *   2. 이 파일에 registerPostProcessHook() 한 줄을 추가한다.
 *
 * lib/aiJobs/worker.ts::processJob()·lib/aiJobs/lifecycle.ts(메커니즘 자체)는 이 파일이
 * 무엇을 등록하든 전혀 알지 못하며, 새 기능 추가를 위해 다시 수정할 필요가 없다.
 */
registerPostProcessHook({
  name: "customer-notification",
  priority: 100,
  run: runCustomerNotificationHook,
});

// 향후 신규 Hook은 아래처럼 한 줄씩만 추가한다(예시, 지금 만들지 않음):
// registerPostProcessHook({ name: "slack-notification", priority: 200, run: runSlackNotificationHook });
