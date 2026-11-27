import { createHash, timingSafeEqual } from "node:crypto";
import { isExcludedDepositor, parseNhSms } from "../deposit";
import { getAuthConfig, isAdminRequest } from "./auth";
import { isClockDevice } from "./clock";
import { fail } from "./http";
import { newId } from "./service";
import type { ContractStore, DepositRecord } from "./store";

/**
 * 입금 확인(계좌이체 결제). 사장님 폰이 받은 은행 입금 문자를 서버로 보내면 입금 내역으로 저장하고,
 * 포스기 화면에서 직원이 계산서와 대조해 "확인" 처리한다.
 * - 입금 내역은 90일 후 정리한다(입금자명은 개인정보라 오래 보관하지 않는다).
 * - 카드사 정산 입금은 저장하지 않는다. 출금·상관없는 문자도 저장하지 않는다.
 * - 문자를 읽지 못한 입금 건은 버리지 않고 "해석 실패"로 남겨, 직원이 은행 앱에서 확인할 수 있게 한다.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_MS = 9 * 60 * 60 * 1000;
const MAX_TEXT = 2000;
const MAX_MEMO = 60;
const UNPARSED_NAME = "(해석 실패)";

export type DepositResult = { status: number; body: Record<string, unknown> };

// ── 폰 → 서버: 입금 문자 접수 ─────────────────────────

/** 폰과 서버가 나눠 가진 비밀 키가 맞는지. 키가 설정되지 않았으면 null(접수 불가). */
export function ingestAuth(request: Request, env: Record<string, string | undefined> = process.env): boolean | null {
  const secret = env.DEPOSIT_INGEST_SECRET?.trim();
  if (!secret || secret.length < 16) return null;
  const header = request.headers.get("authorization") ?? "";
  const given = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : (request.headers.get("x-deposit-secret") ?? "").trim();
  // 길이가 달라도 같은 시간에 비교하도록 해시로 맞춘다.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

/** 문자 본문을 꺼낸다. JSON({"text": "..."})이면 그 값을, 아니면 본문 전체를 문자로 본다(줄바꿈이 섞인 문자도 안전하게 받기 위해). */
export async function readSmsText(request: Request): Promise<{ ok: true; text: string } | { ok: false; response: Response }> {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > 8000) return { ok: false, response: fail(413, "요청이 너무 큽니다.") };
  const raw = await request.text();
  if (raw.length > 8000) return { ok: false, response: fail(413, "요청이 너무 큽니다.") };
  if ((request.headers.get("content-type") || "").includes("application/json")) {
    try {
      const j = JSON.parse(raw) as unknown;
      if (typeof j === "object" && j !== null) {
        const t = (j as Record<string, unknown>).text ?? (j as Record<string, unknown>).message;
        if (typeof t === "string") return { ok: true, text: t };
      }
    } catch {
      /* JSON이 아니면 본문 전체를 문자로 본다 */
    }
  }
  return { ok: true, text: raw };
}

export async function ingestDepositSms(store: ContractStore, rawText: string, now: Date = new Date()): Promise<DepositResult> {
  const nowIso = now.toISOString();
  await store.touchDepositIngest(nowIso); // 폰이 살아 있다는 표시(어떤 문자든 받으면 갱신)
  const text = rawText.slice(0, MAX_TEXT);
  const p = parseNhSms(text, now);
  if (p.kind === "ignored" || p.kind === "withdrawal") return { status: 200, body: { ok: true, saved: false, reason: p.kind } };

  if (p.kind === "unparsed") {
    const rec: DepositRecord = { id: newId(), amount: 0, depositor: UNPARSED_NAME, occurredAt: nowIso, receivedAt: nowIso, confirmedAt: null, memo: text.replace(/\s+/g, " ").trim().slice(0, 200), unparsed: true };
    await store.insertDeposit(rec);
    return { status: 200, body: { ok: true, saved: true, reason: "unparsed" } };
  }

  const settings = await store.getDepositSettings();
  if (isExcludedDepositor(p.depositor, settings.excludeNames)) return { status: 200, body: { ok: true, saved: false, reason: "excluded" } };

  const rec: DepositRecord = { id: newId(), amount: p.amount, depositor: p.depositor, occurredAt: p.occurredAt, receivedAt: nowIso, confirmedAt: null, memo: "" };
  const inserted = await store.insertDeposit(rec);
  // 당일 입금 확인만 쓰므로, 오늘(한국 시간) 0시 이전 내역은 새 입금이 들어올 때 지운다.
  if (inserted) await store.purgeDepositsBefore(sinceKstDays(1, now));
  return { status: 200, body: { ok: true, saved: inserted, reason: inserted ? "saved" : "duplicate" } };
}

// ── 포스기·관리자 화면 ─────────────────────────────────

/** 입금 내역을 보거나 확인 처리할 수 있는 사람: 관리자 로그인 또는 등록된 매장 기기(포스기). 아니면 응답, 맞으면 null. */
export function requireDepositViewer(request: Request): Response | null {
  const cfg = getAuthConfig();
  if (!cfg.configured) return fail(503, cfg.problem ?? "관리자 인증이 설정되지 않았습니다.");
  if (isAdminRequest(request.headers.get("cookie"), cfg) || isClockDevice(request)) return null;
  return fail(403, "등록된 매장 기기가 아닙니다. 사장님께 이 기기 등록을 요청해 주세요.", { code: "no-device" });
}

/** 오늘(한국 시간) 0시부터 `days`일 전까지의 시작 시각(ISO). */
export function sinceKstDays(days: number, now: Date): string {
  const k = new Date(now.getTime() + KST_MS);
  k.setUTCHours(0, 0, 0, 0);
  return new Date(k.getTime() - KST_MS - (days - 1) * DAY_MS).toISOString();
}

export async function depositBoard(store: ContractStore, daysInput: unknown, now: Date = new Date()): Promise<DepositResult> {
  const n = Number(daysInput);
  const days = Number.isInteger(n) && n >= 1 && n <= 31 ? n : 1;
  const [deposits, settings] = await Promise.all([store.listDeposits({ from: sinceKstDays(days, now) }), store.getDepositSettings()]);
  return { status: 200, body: { ok: true, days, deposits, lastIngestAt: settings.lastIngestAt, serverNow: now.toISOString() } };
}

/** 직원이 입금을 확인했다고 표시하거나 메모를 남긴다. */
export async function updateDepositState(store: ContractStore, input: unknown, now: Date = new Date()): Promise<DepositResult> {
  const b = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const id = typeof b.id === "string" ? b.id : "";
  if (!id) return { status: 400, body: { ok: false, error: "입금 내역을 확인해 주세요." } };
  const patch: { confirmedAt?: string | null; memo?: string } = {};
  if (b.confirmed !== undefined) {
    if (typeof b.confirmed !== "boolean") return { status: 400, body: { ok: false, error: "확인 여부가 올바르지 않습니다." } };
    patch.confirmedAt = b.confirmed ? now.toISOString() : null;
  }
  if (b.memo !== undefined) {
    if (typeof b.memo !== "string") return { status: 400, body: { ok: false, error: "메모가 올바르지 않습니다." } };
    patch.memo = b.memo.replace(/\s+/g, " ").trim().slice(0, MAX_MEMO);
  }
  if (patch.confirmedAt === undefined && patch.memo === undefined) return { status: 400, body: { ok: false, error: "바꿀 내용이 없습니다." } };
  const rec = await store.updateDeposit(id, patch);
  return rec ? { status: 200, body: { ok: true, deposit: rec } } : { status: 404, body: { ok: false, error: "입금 내역을 찾을 수 없습니다." } };
}
