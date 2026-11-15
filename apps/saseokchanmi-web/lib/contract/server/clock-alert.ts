import { hhmm, kst } from "../clock-sheet";
import { SITE_URL } from "@/lib/site-config";
import { adminEmployees } from "./clock";
import { notifyOwner, safeName, type Env, type NotifyResult } from "./notify";
import type { ContractStore } from "./store";

/**
 * 퇴근 기록이 빠진 직원을 사업주에게 알린다(매일 정해진 시각에 한 번, 없으면 보내지 않는다).
 * 기준은 출퇴근 화면과 같다: 마지막 기록이 출근이고 16시간이 지났으면 퇴근 누락이다.
 * 정정하기 전까지는 다음 날에도 다시 알린다. 알림에는 이름과 출근 시각만 넣는다.
 */

const MAX_LISTED = 10;

export interface MissingCheckout {
  id: string;
  name: string;
  since: string;
}

export async function missingCheckouts(store: ContractStore, now: Date = new Date()): Promise<MissingCheckout[]> {
  const list = await adminEmployees(store, now);
  return list.filter((e) => e.stale && e.lastAt).map((e) => ({ id: e.id, name: e.name, since: e.lastAt as string }));
}

export function buildMissingMessage(missing: MissingCheckout[], link = `${SITE_URL}/admin/clock`): string {
  const shown = missing
    .slice(0, MAX_LISTED)
    .map((m) => {
      const t = kst(m.since);
      return `${safeName(m.name)}(${t.date.slice(5).replace("-", "/")} ${hhmm(m.since)} 출근)`;
    })
    .join(", ");
  const more = missing.length > MAX_LISTED ? ` 외 ${missing.length - MAX_LISTED}명` : "";
  return `[사색찬미] 퇴근 기록이 없는 직원이 ${missing.length}명 있습니다: ${shown}${more}\n월간 기록부에서 퇴근 시각을 정정해 주세요.\n${link}`;
}

export interface AlertResult {
  count: number;
  sent: NotifyResult[];
}

export async function runMissingCheckoutAlert(store: ContractStore, env: Env = process.env, now: Date = new Date(), fetchFn: typeof fetch = fetch): Promise<AlertResult> {
  const missing = await missingCheckouts(store, now);
  if (missing.length === 0) return { count: 0, sent: [] };
  return { count: missing.length, sent: await notifyOwner(buildMissingMessage(missing), env, fetchFn) };
}
