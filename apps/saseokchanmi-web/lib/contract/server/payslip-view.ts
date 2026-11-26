import { isValidPin, pinMatches } from "./clock";
import { isOwnerSigned } from "./status";
import type { ContractStore, PayslipRecord } from "./store";

/**
 * 직원 본인의 급여명세서 조회. 알림톡 링크로 들어온 직원이 출퇴근 PIN 4자리로 본인 확인을 한 뒤, 확정된 명세서만 본다.
 * - 직원 링크는 추측할 수 없는 직원 id를 쓰지만, 링크만으로는 아무것도 보이지 않는다(PIN이 맞아야 한다).
 * - PIN을 5번 틀리면 10분간 잠긴다. 출퇴근 기록과 잠금을 따로 세어, 한쪽을 공격해도 다른 쪽이 막히지 않는다.
 * - 확정된 명세서만 보여 주고, 확정 이력(history)과 사업주가 넣은 조정 입력(input)은 내려 주지 않는다.
 */

const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;
const MAX_MONTHS = 24;

export type PayslipViewResult = { status: number; body: Record<string, unknown> };
export type EmployeePayslip = Pick<PayslipRecord, "month" | "revision" | "confirmedAt" | "payDate" | "employeeName" | "employeeNo" | "biz" | "owner" | "statement">;

export async function employeePayslips(store: ContractStore, input: unknown, now: Date = new Date()): Promise<PayslipViewResult> {
  const b = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const id = typeof b.id === "string" ? b.id : "";
  if (!id || !isValidPin(b.pin)) return { status: 400, body: { ok: false, error: "PIN 숫자 4자리를 입력해 주세요." } };

  const sub = await store.getSubmission(id);
  const pinRec = sub && isOwnerSigned(sub) ? await store.getClockPin(id) : null;
  if (!sub || !pinRec) return { status: 404, body: { ok: false, error: "확인할 수 없는 링크입니다. 사장님께 문의해 주세요." } };

  const key = "payslip:" + id;
  const t = now.getTime();
  const attempt = await store.getAttempt(key);
  if (attempt && attempt.lockedUntil > t) {
    return { status: 429, body: { ok: false, error: `PIN을 여러 번 틀려 잠겼습니다. ${Math.ceil((attempt.lockedUntil - t) / 60000)}분 뒤에 다시 시도하거나 사장님께 문의해 주세요.` } };
  }
  if (!pinMatches(b.pin, pinRec)) {
    const fresh = !attempt || t - attempt.firstAt > LOCK_MS;
    const count = fresh ? 1 : attempt.count + 1;
    await store.putAttempt({ key, count, firstAt: fresh ? t : attempt.firstAt, lockedUntil: count >= MAX_FAILS ? t + LOCK_MS : 0 });
    const left = Math.max(0, MAX_FAILS - count);
    return { status: 401, body: { ok: false, error: left > 0 ? `PIN이 올바르지 않습니다. (${left}번 더 틀리면 잠깁니다)` : "PIN을 여러 번 틀려 잠겼습니다. 10분 뒤에 다시 시도해 주세요." } };
  }
  if (attempt) await store.clearAttempt(key);

  const list = (await store.listPayslips({ submissionId: id }))
    .sort((a, c) => c.month.localeCompare(a.month))
    .slice(0, MAX_MONTHS)
    .map(({ month, revision, confirmedAt, payDate, employeeName, employeeNo, biz, owner, statement }): EmployeePayslip => ({ month, revision, confirmedAt, payDate, employeeName, employeeNo, biz, owner, statement }));
  return { status: 200, body: { ok: true, name: sub.name, payslips: list } };
}
