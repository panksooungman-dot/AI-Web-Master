import { koDateToIso, safeImg } from "./format";
import type { Allowance, CompanySettings, ContractConfig, SchedDay } from "./types";

/**
 * 서버가 받은 JSON(신뢰할 수 없는 입력)을 계약 설정·공통 설정으로 정리한다 (요청서 8장).
 * 알려진 필드만 통과시키고, 길이·형식·열거값을 다시 검증한다. 모르는 필드는 버린다.
 * 보내지 않은 필드는 결과에 넣지 않는다(기본값은 buildConfig가 채운다).
 */

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Out = Record<string, unknown>;

class Collector {
  errors: string[] = [];
  out: Out = {};
  constructor(private src: Record<string, unknown>) {}
  has(k: string) {
    return k in this.src && this.src[k] !== undefined;
  }
  str(k: string, max: number) {
    if (!this.has(k)) return;
    const v = this.src[k];
    if (typeof v !== "string") return void this.errors.push(`${k}: 문자열이어야 합니다.`);
    if (v.length > max) return void this.errors.push(`${k}: ${max}자 이하로 입력해 주세요.`);
    this.out[k] = v.trim();
  }
  enm<T extends string>(k: string, allowed: readonly T[]) {
    if (!this.has(k)) return;
    const v = this.src[k];
    if (typeof v !== "string" || !allowed.includes(v as T)) return void this.errors.push(`${k}: 허용되지 않는 값입니다.`);
    this.out[k] = v;
  }
  bool(k: string) {
    if (!this.has(k)) return;
    if (typeof this.src[k] !== "boolean") return void this.errors.push(`${k}: true/false여야 합니다.`);
    this.out[k] = this.src[k];
  }
  digits(k: string, maxLen: number, range?: [number, number]) {
    if (!this.has(k)) return;
    const v = this.src[k];
    if (typeof v !== "string" && typeof v !== "number") return void this.errors.push(`${k}: 숫자여야 합니다.`);
    const s = String(v).replace(/\D/g, "");
    if (s.length > maxLen) return void this.errors.push(`${k}: 너무 큰 값입니다.`);
    if (range && s !== "" && (+s < range[0] || +s > range[1])) return void this.errors.push(`${k}: ${range[0]}~${range[1]} 사이여야 합니다.`);
    this.out[k] = s;
  }
  time(k: string) {
    if (!this.has(k)) return;
    const v = this.src[k];
    if (typeof v !== "string" || (v !== "" && !TIME.test(v))) return void this.errors.push(`${k}: 시각은 HH:MM 형식이어야 합니다.`);
    this.out[k] = v;
  }
  date(k: string) {
    if (!this.has(k)) return;
    const v = this.src[k];
    if (typeof v !== "string") return void this.errors.push(`${k}: 날짜 형식이 아닙니다.`);
    if (v === "") {
      this.out[k] = "";
      return;
    }
    const iso = ISO_DATE.test(v) ? v : koDateToIso(v);
    const d = new Date(iso + "T00:00:00Z");
    if (!iso || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return void this.errors.push(`${k}: 날짜를 읽을 수 없습니다.`);
    this.out[k] = iso;
  }
}

const TIME_OR_EMPTY = (v: unknown): v is string => typeof v === "string" && (v === "" || TIME.test(v));

function parseSched(v: unknown, errors: string[]): SchedDay[] | undefined {
  if (!Array.isArray(v) || v.length !== 7) {
    errors.push("sched: 월~일 7개 항목이어야 합니다.");
    return undefined;
  }
  const rows: SchedDay[] = [];
  for (const x of v) {
    if (!isObj(x) || !["work", "off", "week"].includes(x.t as string) || ![x.s, x.e, x.bs, x.be].every(TIME_OR_EMPTY)) {
      errors.push("sched: 근무표 항목 형식이 올바르지 않습니다.");
      return undefined;
    }
    rows.push({ t: x.t as SchedDay["t"], s: x.s as string, e: x.e as string, bs: x.bs as string, be: x.be as string });
  }
  return rows;
}

function parseAllow(v: unknown, errors: string[]): Allowance[] | undefined {
  if (!Array.isArray(v) || v.length > 3) {
    errors.push("allow: 고정수당은 최대 3개입니다.");
    return undefined;
  }
  const rows: Allowance[] = [];
  for (const x of v) {
    if (!isObj(x) || typeof x.n !== "string" || x.n.length > 30 || !(typeof x.a === "string" || typeof x.a === "number")) {
      errors.push("allow: 고정수당 항목 형식이 올바르지 않습니다.");
      return undefined;
    }
    const a = String(x.a).replace(/\D/g, "");
    if (a.length > 10) {
      errors.push("allow: 금액이 너무 큽니다.");
      return undefined;
    }
    rows.push({ n: x.n.trim(), a });
  }
  while (rows.length < 3) rows.push({ n: "", a: "" });
  return rows;
}

/** 직원 계약 설정(공통 설정 항목 제외) 정리. */
export function parseWorkerConfig(input: unknown): ParseResult<Partial<ContractConfig>> {
  if (!isObj(input)) return { ok: false, errors: ["요청 형식이 올바르지 않습니다."] };
  const c = new Collector(input);
  c.enm("type", ["hourly", "monthly", "parttime"] as const);
  c.str("label", 40);
  c.date("date");
  c.enm("termType", ["open", "fixed"] as const);
  c.date("start");
  c.date("end");
  c.str("duty", 100);
  for (const k of ["workS", "workE", "brkS", "brkE"]) c.time(k);
  c.str("brkNote", 300);
  c.digits("days", 1, [0, 7]);
  c.str("weekRule", 300);
  c.str("weekRule2", 300);
  c.bool("useSched");
  c.enm("wageType", ["시급", "월급"] as const);
  c.digits("wage", 9);
  c.enm("holiday", ["separate", "none"] as const);
  c.digits("basePay", 10);
  c.enm("bonus", ["none", "has"] as const);
  c.digits("bonusAmt", 10);
  c.enm("other", ["none", "has"] as const);
  c.str("otherText", 300);
  c.digits("payDay", 2, [1, 31]);
  c.enm("payMethod", ["", "direct", "bank"] as const);
  c.str("insNote", 300);
  c.str("extra", 2000);

  if (c.has("sched")) {
    const s = parseSched(input.sched, c.errors);
    if (s) c.out.sched = s;
  }
  if (c.has("allow")) {
    const a = parseAllow(input.allow, c.errors);
    if (a) c.out.allow = a;
  }
  if (c.has("ins")) {
    const v = input.ins;
    if (!isObj(v) || !["emp", "acc", "pen", "hlt"].every((k) => v[k] === "y" || v[k] === "n")) {
      c.errors.push("ins: 4대 사회보험 적용 여부 형식이 올바르지 않습니다.");
    } else {
      c.out.ins = { emp: v.emp, acc: v.acc, pen: v.pen, hlt: v.hlt };
    }
  }
  return c.errors.length ? { ok: false, errors: c.errors } : { ok: true, value: c.out as Partial<ContractConfig> };
}

/** 공통 설정(사업주 정보·서명·워터마크) 정리. `minWage`는 관리자 설정용 최저시급. */
export function parseCompanySettings(input: unknown): ParseResult<Partial<CompanySettings> & { minWage?: number }> {
  if (!isObj(input)) return { ok: false, errors: ["요청 형식이 올바르지 않습니다."] };
  const c = new Collector(input);
  for (const k of ["biz", "owner", "tel", "addr"] as const) {
    c.str(k, 100);
    if (c.has(k) && !(c.out[k] as string)) c.errors.push(`${k}: 비워 둘 수 없습니다.`);
  }
  c.bool("watermark");
  if (c.has("ownerSig")) {
    const v = input.ownerSig;
    if (v === "" || v === null) c.out.ownerSig = "";
    else if (typeof v === "string" && safeImg(v)) c.out.ownerSig = v;
    else c.errors.push("ownerSig: PNG 이미지(data URL)이고 크기 제한 이내여야 합니다.");
  }
  if (c.has("minWage")) {
    const v = input.minWage;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1000 || v > 100000) c.errors.push("minWage: 1,000~100,000 사이의 정수여야 합니다.");
    else c.out.minWage = v;
  }
  return c.errors.length ? { ok: false, errors: c.errors } : { ok: true, value: c.out as Partial<CompanySettings> & { minWage?: number } };
}

/** 근로자가 보낸 사회보험 미적용 사유서 입력을 정리한다. 형식이 틀리면 null. */
export function parseInsForm(input: unknown): import("./types").InsForm | null {
  if (!isObj(input)) return null;
  const r: Record<string, string> = {};
  if (isObj(input.r)) {
    for (const k of ["emp", "acc", "pen", "hlt"]) {
      const v = (input.r as Record<string, unknown>)[k];
      if (typeof v === "string" && ["1", "2", "3", "4"].includes(v)) r[k] = v;
    }
  }
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const c = Array.isArray(input.c) ? input.c.slice(0, 3).map((x) => x === true) : [];
  return { r, other: s(input.other, 100), birth: s(input.birth, 20), detail: s(input.detail, 1000), c };
}
