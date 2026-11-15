import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { fetchWindow, isMonth, monthRange, parseKstLocal } from "../clock-sheet";
import { getAuthConfig, readCookie } from "./auth";
import { newId } from "./service";
import { isOwnerSigned } from "./status";
import type { ClockEventRecord, ContractStore, SubmissionRecord } from "./store";

/**
 * 출퇴근 기록 (서버 전용).
 * - 매장 기기 등록: 관리자가 로그인한 상태에서 "이 기기를 출퇴근 기기로 등록"하면 서명된 쿠키가 기기에 남는다.
 *   등록된 기기에서만 직원 목록이 보이고 출퇴근을 기록할 수 있어서, 집 같은 곳에서 대신 찍는 일을 막는다.
 * - 직원 확인: 서명이 끝난(사업주 서명까지 확정된) 계약의 직원만 대상이며, 직원별 4자리 PIN으로 본인을 확인한다.
 * - 시각은 항상 서버 시각이다.
 */

export const DEVICE_COOKIE = "clock_device";
const DEVICE_TTL_SEC = 180 * 24 * 60 * 60;
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;
/** 같은 직원이 이 시간 안에 다시 누르면 실수로 두 번 누른 것으로 보고 막는다. */
const DUPLICATE_MS = 30 * 1000;

export type ClockResult = { status: number; body: Record<string, unknown> };
export type ClockEmployee = { id: string; name: string; status: "in" | "out" };

// ── PIN ─────────────────────────────────────────────

export const isValidPin = (pin: unknown): pin is string => typeof pin === "string" && /^\d{4}$/.test(pin);

export function hashPin(pin: string, salt: string = randomBytes(16).toString("hex")): { hash: string; salt: string } {
  return { hash: scryptSync(pin, salt, 32).toString("hex"), salt };
}

export function pinMatches(pin: string, rec: { hash: string; salt: string }): boolean {
  const a = Buffer.from(hashPin(pin, rec.salt).hash, "hex");
  const b = Buffer.from(rec.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── 기기 등록 쿠키 ───────────────────────────────────
// 관리자 세션 토큰(v:1)과 같은 비밀키로 서명하므로, 용도가 섞이지 않도록 버전(v:2)과 종류(k)를 따로 둔다.
// 관리자 검증은 v===1만 받으므로 기기 토큰으로는 관리자 화면에 들어갈 수 없다.

const mac = (secret: string, body: string) => createHmac("sha256", secret).update(body).digest("base64url");

export function createDeviceToken(secret: string, now: number = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ v: 2, k: "clock", exp: now + DEVICE_TTL_SEC * 1000, n: randomBytes(8).toString("hex") })).toString("base64url");
  return body + "." + mac(secret, body);
}

export function verifyDeviceToken(token: string | undefined | null, secret: string, now: number = Date.now()): boolean {
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const body = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expected = mac(secret, body);
  if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return false;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    return !!p && p.v === 2 && p.k === "clock" && typeof p.exp === "number" && p.exp > now;
  } catch {
    return false;
  }
}

export const deviceCookie = (token: string, secure: boolean): string => `${DEVICE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DEVICE_TTL_SEC}${secure ? "; Secure" : ""}`;
export const clearDeviceCookie = (secure: boolean): string => `${DEVICE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;

/** 요청이 등록된 출퇴근 기기에서 온 것인지 서버에서 확인한다. */
export function isClockDevice(request: Request, now: number = Date.now()): boolean {
  const cfg = getAuthConfig();
  if (!cfg.configured || !cfg.secret) return false;
  return verifyDeviceToken(readCookie(request.headers.get("cookie"), DEVICE_COOKIE), cfg.secret, now);
}

// ── 직원·기록 ───────────────────────────────────────

/** 출퇴근 대상: 사업주 서명까지 끝나 확정된 계약의 직원. */
const confirmed = (subs: SubmissionRecord[]): SubmissionRecord[] => subs.filter(isOwnerSigned);

export async function adminEmployees(store: ContractStore) {
  const [subs, pins, last] = await Promise.all([store.listSubmissions(), store.listClockPins(), store.lastClockEvents()]);
  const hasPin = new Set(pins.map((p) => p.submissionId));
  return confirmed(subs)
    .map((s) => ({ id: s.id, name: s.name, hasPin: hasPin.has(s.id), status: (last[s.id]?.kind === "in" ? "in" : "out") as "in" | "out", lastAt: last[s.id]?.at ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/** 기기 화면에 보일 직원 목록: 확정된 계약 + PIN이 발급된 직원만. */
export async function roster(store: ContractStore): Promise<ClockEmployee[]> {
  const list = await adminEmployees(store);
  return list.filter((e) => e.hasPin).map(({ id, name, status }) => ({ id, name, status }));
}

export async function setPin(store: ContractStore, submissionId: string, pin: string | null, now: Date = new Date()): Promise<ClockResult> {
  const sub = await store.getSubmission(submissionId);
  if (!sub || !isOwnerSigned(sub)) return { status: 404, body: { ok: false, error: "사업주 서명까지 끝난(확정된) 계약의 직원만 PIN을 만들 수 있습니다." } };
  const generated = pin === null;
  const value = pin ?? String(randomInt(0, 10_000)).padStart(4, "0");
  if (!isValidPin(value)) return { status: 400, body: { ok: false, error: "PIN은 숫자 4자리여야 합니다." } };
  await store.putClockPin({ submissionId, ...hashPin(value), updatedAt: now.toISOString() });
  await store.clearAttempt("clock:" + submissionId); // 새 PIN을 만들면 잠금도 풀린다
  return { status: 200, body: { ok: true, ...(generated ? { pin: value } : {}) } };
}

/** 출근·퇴근 기록. PIN이 맞고 현재 상태와 맞는 동작일 때만 서버 시각으로 저장한다. */
export async function punch(store: ContractStore, input: unknown, now: Date = new Date()): Promise<ClockResult> {
  const b = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const id = typeof b.id === "string" ? b.id : "";
  const kind = b.kind === "in" || b.kind === "out" ? b.kind : null;
  if (!id || !kind || !isValidPin(b.pin)) return { status: 400, body: { ok: false, error: "직원과 PIN 4자리를 확인해 주세요." } };

  const sub = await store.getSubmission(id);
  const pinRec = sub && isOwnerSigned(sub) ? await store.getClockPin(id) : null;
  if (!sub || !pinRec) return { status: 404, body: { ok: false, error: "직원 정보를 확인해 주세요." } };

  const key = "clock:" + id;
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

  const last = (await store.lastClockEvents())[id] ?? null;
  const current = last?.kind === "in" ? "in" : "out";
  if (last && t - new Date(last.at).getTime() < DUPLICATE_MS) {
    return { status: 409, body: { ok: false, code: "duplicate", error: "방금 기록되었습니다." } };
  }
  if ((current === "in") === (kind === "in")) {
    return { status: 409, body: { ok: false, code: "state", status: current, error: current === "in" ? "이미 출근 상태입니다. 화면을 새로고침해 퇴근을 눌러 주세요." : "이미 퇴근 상태입니다. 화면을 새로고침해 출근을 눌러 주세요." } };
  }
  const rec: ClockEventRecord = { id: newId(), submissionId: id, kind, at: now.toISOString(), source: "device", note: "" };
  await store.insertClockEvent(rec);
  return { status: 201, body: { ok: true, kind, at: rec.at, name: sub.name } };
}

/** 관리자 화면용 최근 기록(최신순). 직원 이름을 붙여서 돌려준다. */
export async function recentEvents(store: ContractStore, days = 7, now: Date = new Date()) {
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const [events, subs] = await Promise.all([store.listClockEvents({ from }), store.listSubmissions()]);
  const names = new Map(subs.map((s) => [s.id, s.name]));
  return events.map((e) => ({ ...e, name: names.get(e.submissionId) ?? "(삭제된 직원)" })).reverse();
}

// ── 월간 기록부·관리자 정정 ──────────────────────────

const MAX_REASON = 200;
/** 관리자가 입력하는 시각은 지금보다 이 시간 넘게 미래일 수 없다. */
const FUTURE_SLACK_MS = 5 * 60 * 1000;

const reasonOf = (v: unknown): string => (typeof v === "string" ? v.trim().slice(0, MAX_REASON) : "");
const snap = (e: Pick<ClockEventRecord, "kind" | "at">) => ({ kind: e.kind, at: e.at });

/** 월간 기록부에 필요한 데이터: 직원, 계약 스냅샷(근무표·시급), 이 달 앞뒤 기록, 이 달 정정 이력. */
export async function sheetData(store: ContractStore, submissionId: string, month: string): Promise<ClockResult> {
  if (!isMonth(month)) return { status: 400, body: { ok: false, error: "월은 YYYY-MM 형식이어야 합니다." } };
  const sub = await store.getSubmission(submissionId);
  if (!sub || !isOwnerSigned(sub)) return { status: 404, body: { ok: false, error: "확정된 계약의 직원을 찾을 수 없습니다." } };
  const win = fetchWindow(month);
  const r = monthRange(month);
  const [events, audit] = await Promise.all([store.listClockEvents({ submissionId, from: win.from, to: win.to }), store.listClockAudit({ submissionId, from: r.from, to: r.to })]);
  const c = sub.configSnapshot;
  const config = { type: c.type, wageType: c.wageType, wage: c.wage, start: c.start, useSched: c.useSched, sched: c.sched, workS: c.workS, workE: c.workE, brkS: c.brkS, brkE: c.brkE, days: c.days };
  return { status: 200, body: { ok: true, employee: { id: sub.id, name: sub.name }, biz: c.biz, config, events, audit, month } };
}

/** 관리자가 빠진 출퇴근 기록을 직접 넣는다. 사유가 필수이고 이력이 남는다. */
export async function addEvent(store: ContractStore, input: unknown, now: Date = new Date()): Promise<ClockResult> {
  const b = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const kind = b.kind === "in" || b.kind === "out" ? b.kind : null;
  const at = parseKstLocal(b.at);
  const reason = reasonOf(b.reason);
  const submissionId = typeof b.submissionId === "string" ? b.submissionId : "";
  if (!kind || !at) return { status: 400, body: { ok: false, error: "구분(출근/퇴근)과 날짜·시각을 확인해 주세요." } };
  if (!reason) return { status: 400, body: { ok: false, error: "정정 사유를 입력해 주세요." } };
  if (Date.parse(at) > now.getTime() + FUTURE_SLACK_MS) return { status: 400, body: { ok: false, error: "미래 시각은 입력할 수 없습니다." } };
  const sub = await store.getSubmission(submissionId);
  if (!sub || !isOwnerSigned(sub)) return { status: 404, body: { ok: false, error: "확정된 계약의 직원을 찾을 수 없습니다." } };
  const rec: ClockEventRecord = { id: newId(), submissionId, kind, at, source: "admin", note: reason };
  await store.insertClockEvent(rec);
  await store.insertClockAudit({ id: newId(), eventId: rec.id, submissionId, action: "add", before: null, after: snap(rec), reason, at: now.toISOString() });
  return { status: 201, body: { ok: true, event: rec } };
}

/** 기록의 시각·구분을 고친다. 고치기 전 내용과 사유를 이력에 남긴다. */
export async function editEvent(store: ContractStore, eventId: string, input: unknown, now: Date = new Date()): Promise<ClockResult> {
  const b = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const reason = reasonOf(b.reason);
  if (!reason) return { status: 400, body: { ok: false, error: "정정 사유를 입력해 주세요." } };
  const patch: { kind?: "in" | "out"; at?: string } = {};
  if (b.kind !== undefined) {
    if (b.kind !== "in" && b.kind !== "out") return { status: 400, body: { ok: false, error: "구분은 출근 또는 퇴근이어야 합니다." } };
    patch.kind = b.kind;
  }
  if (b.at !== undefined) {
    const at = parseKstLocal(b.at);
    if (!at) return { status: 400, body: { ok: false, error: "날짜·시각 형식이 올바르지 않습니다." } };
    if (Date.parse(at) > now.getTime() + FUTURE_SLACK_MS) return { status: 400, body: { ok: false, error: "미래 시각은 입력할 수 없습니다." } };
    patch.at = at;
  }
  if (patch.kind === undefined && patch.at === undefined) return { status: 400, body: { ok: false, error: "바꿀 내용이 없습니다." } };
  const before = await store.getClockEvent(eventId);
  if (!before) return { status: 404, body: { ok: false, error: "기록을 찾을 수 없습니다." } };
  const after = await store.updateClockEvent(eventId, { ...patch, source: "admin", note: reason });
  if (!after) return { status: 404, body: { ok: false, error: "기록을 찾을 수 없습니다." } };
  await store.insertClockAudit({ id: newId(), eventId, submissionId: before.submissionId, action: "edit", before: snap(before), after: snap(after), reason, at: now.toISOString() });
  return { status: 200, body: { ok: true, event: after } };
}

/** 기록을 삭제한다. 삭제한 내용은 이력에 남는다. */
export async function removeEvent(store: ContractStore, eventId: string, input: unknown, now: Date = new Date()): Promise<ClockResult> {
  const reason = reasonOf(typeof input === "object" && input !== null ? (input as Record<string, unknown>).reason : "");
  if (!reason) return { status: 400, body: { ok: false, error: "삭제 사유를 입력해 주세요." } };
  const before = await store.getClockEvent(eventId);
  if (!before || !(await store.deleteClockEvent(eventId))) return { status: 404, body: { ok: false, error: "기록을 찾을 수 없습니다." } };
  await store.insertClockAudit({ id: newId(), eventId, submissionId: before.submissionId, action: "delete", before: snap(before), after: null, reason, at: now.toISOString() });
  return { status: 200, body: { ok: true } };
}
