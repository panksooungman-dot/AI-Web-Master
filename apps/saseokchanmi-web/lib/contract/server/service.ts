import { randomBytes } from "node:crypto";
import { buildConfig, DEFAULT_COMPANY, DEFAULT_MIN_WAGE, fmtPhone, insOff, isValidSignature, parseInsForm, validateInsForm, validateWorkerInfo } from "..";
import type { ContractConfig } from "..";
import type { ConfigRecord, ContractStore, SettingsRecord, SubmissionRecord } from "./store";

export const newToken = (): string => randomBytes(12).toString("base64url");
export const newId = (): string => randomBytes(9).toString("base64url");

export const defaultSettings = (): SettingsRecord => ({ company: { ...DEFAULT_COMPANY }, minWage: DEFAULT_MIN_WAGE, updatedAt: "" });

export async function loadSettings(store: ContractStore): Promise<SettingsRecord> {
  return (await store.getSettings()) ?? defaultSettings();
}

/** 저장된 직원 설정 + 현재 공통 설정을 합친 렌더링용 전체 설정. */
export function effectiveConfig(settings: SettingsRecord, rec: ConfigRecord): ContractConfig {
  return buildConfig(settings.company, rec.config);
}

export type ServiceResult = { status: number; body: Record<string, unknown> };

const SIG_MIN_LENGTH = 150;

/**
 * 근로자 서명 제출. 계약 조건은 클라이언트가 보낸 값을 쓰지 않고, 서버가 저장된 설정으로
 * 서명 시점 스냅샷을 만든다. 서명 시각도 서버 시각이다. 한 토큰으로는 1건만 제출할 수 있다.
 */
export async function submitContract(store: ContractStore, token: string, body: unknown, now: Date = new Date()): Promise<ServiceResult> {
  const rec = await store.getConfig(token);
  if (!rec) return { status: 404, body: { ok: false, error: "계약서 링크를 확인해 주세요." } };
  if (await store.getSubmissionByToken(token)) return { status: 409, body: { ok: false, error: "이미 제출된 계약서입니다." } };
  if (typeof body !== "object" || body === null) return { status: 400, body: { ok: false, error: "요청 형식이 올바르지 않습니다." } };
  const b = body as Record<string, unknown>;

  const info = { name: String(b.name ?? ""), phone: String(b.phone ?? ""), address: String(b.address ?? "") };
  const v = validateWorkerInfo(info);
  if (!v.ok) return { status: 400, body: { ok: false, error: "입력 내용을 확인해 주세요.", fields: v.errors } };
  if (!isValidSignature(b.sig) || (b.sig as string).length < SIG_MIN_LENGTH) {
    return { status: 400, body: { ok: false, error: "서명 이미지가 올바르지 않습니다. 다시 서명해 주세요." } };
  }

  const settings = await loadSettings(store);
  const snapshot: ContractConfig = { ...effectiveConfig(settings, rec), label: "" };

  let insForm = null;
  if (insOff(snapshot).length) {
    insForm = parseInsForm(b.insForm);
    const msg = validateInsForm(snapshot, insForm);
    if (msg) return { status: 400, body: { ok: false, error: msg } };
  }

  const record: SubmissionRecord = {
    id: newId(),
    configToken: token,
    configSnapshot: snapshot,
    name: info.name.trim(),
    phone: fmtPhone(info.phone),
    address: info.address.trim(),
    sig: b.sig as string,
    signedAt: now.toISOString(),
    insForm,
    ownerSig: null,
    countersignedAt: null,
    editedAt: null,
  };
  if (!(await store.insertSubmission(record))) return { status: 409, body: { ok: false, error: "이미 제출된 계약서입니다." } };
  return { status: 201, body: { ok: true, signedAt: record.signedAt, snapshot } };
}
