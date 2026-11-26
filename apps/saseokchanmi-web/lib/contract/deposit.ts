/**
 * 은행 입금 문자 해석(농협). 사장님 폰이 받은 입금 문자를 서버로 보내면, 금액·입금자명·입금 시각만 뽑아 저장한다.
 * - 계좌번호(마스킹된 것 포함)와 잔액은 저장하지 않는다.
 * - 문자에는 연도가 없어서 받은 시각 기준으로 채운다(12월 말 입금이 1월 초에 도착해도 맞게).
 * - 카드사 정산 입금은 입금자명으로 걸러낸다(기본: 이름에 "카드"가 들어가면 제외, 그 밖의 이름은 사장님이 설정에서 추가).
 *
 * 농협 입금 문자 예:
 *   농협 입금1,000원
 *   11/26 19:30
 *   301-****-4369-51
 *   박성만
 */

export type SmsParse =
  | { kind: "deposit"; amount: number; depositor: string; occurredAt: string }
  /** 출금 문자: 저장하지 않는다. */
  | { kind: "withdrawal" }
  /** 입금 문자 같은데 형식을 읽지 못함: 놓치지 않도록 해석 실패로 남긴다. */
  | { kind: "unparsed" }
  /** 입금·출금과 상관없는 문자. */
  | { kind: "ignored" };

const KST_MS = 9 * 60 * 60 * 1000;
const MAX_FUTURE_MS = 36 * 60 * 60 * 1000;
const MAX_NAME = 30;

/** 입금자명이 비어 있으면 읽지 못한 것으로 본다. 첫 줄만 쓰고, 길이를 제한한다. */
function depositorOf(rest: string): string {
  const first = rest
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return (first ?? "").replace(/\s+/g, " ").slice(0, MAX_NAME);
}

export function parseNhSms(raw: string, now: Date = new Date()): SmsParse {
  const text = raw.replace(/\r/g, "").trim();
  const head = /농협\s*(입금|출금)\s*([\d,]+)\s*원/.exec(text);
  if (!head) return /입금/.test(text) ? { kind: "unparsed" } : { kind: "ignored" };
  if (head[1] === "출금") return { kind: "withdrawal" };

  const amount = Number(head[2].replace(/,/g, ""));
  const rest = text.slice(head.index + head[0].length);
  // "MM/DD HH:mm 계좌번호 입금자명": 줄바꿈이 있어도 공백으로 이어져 있어도 읽는다.
  const m = /^\s*(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s+\S+\s+([\s\S]+)$/.exec(rest);
  if (!m || !Number.isSafeInteger(amount) || amount <= 0) return { kind: "unparsed" };

  const [mo, d, hh, mm] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || hh > 23 || mm > 59) return { kind: "unparsed" };
  const depositor = depositorOf(m[5]);
  if (!depositor) return { kind: "unparsed" };

  const at = (year: number): number | null => {
    const probe = new Date(Date.UTC(year, mo - 1, d));
    if (probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null; // 2/30 같은 없는 날짜
    return Date.UTC(year, mo - 1, d, hh, mm) - KST_MS;
  };
  const year = new Date(now.getTime() + KST_MS).getUTCFullYear();
  let ms = at(year);
  if (ms !== null && ms > now.getTime() + MAX_FUTURE_MS) ms = at(year - 1); // 연말 입금이 연초에 도착한 경우
  if (ms === null) return { kind: "unparsed" };
  return { kind: "deposit", amount, depositor, occurredAt: new Date(ms).toISOString() };
}

/** 기본 제외 이름: 카드사 정산 입금은 이름에 "카드"가 들어간다(삼성카드, 비씨카드, KB국민카드 …). */
export const DEFAULT_EXCLUDED: readonly string[] = ["카드"];

const norm = (s: string): string => s.replace(/\s+/g, "").toLowerCase();

/** 입금자명에 제외 이름(기본 + 사장님이 추가한 것)이 들어 있으면 true. 공백·대소문자는 무시한다. */
export function isExcludedDepositor(name: string, extra: readonly string[] = []): boolean {
  const n = norm(name);
  return [...DEFAULT_EXCLUDED, ...extra].some((k) => {
    const kk = norm(k);
    return kk.length > 0 && n.includes(kk);
  });
}

const MAX_EXCLUDES = 30;

/** 설정 화면에서 받은 제외 이름 목록을 검증·정리한다(공백 제거, 중복 제거, 개수·길이 제한). */
export function parseExcludeNames(input: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) return { ok: false, error: "제외할 이름 목록이 올바르지 않습니다." };
  const out: string[] = [];
  for (const v of input) {
    if (typeof v !== "string") return { ok: false, error: "제외할 이름은 글자여야 합니다." };
    const name = v.replace(/\s+/g, " ").trim();
    if (!name) continue;
    if (name.length > MAX_NAME) return { ok: false, error: `제외할 이름은 ${MAX_NAME}자까지 입력할 수 있습니다.` };
    if (!out.includes(name)) out.push(name);
  }
  if (out.length > MAX_EXCLUDES) return { ok: false, error: `제외할 이름은 ${MAX_EXCLUDES}개까지 입력할 수 있습니다.` };
  return { ok: true, value: out };
}

/** 같은 입금이 두 번 전달돼도 한 번만 저장하기 위한 키. 해석 실패 건은 키가 없다. */
export const depositKey = (r: { unparsed?: boolean; occurredAt: string; amount: number; depositor: string }): string | null => (r.unparsed ? null : `${r.occurredAt}|${r.amount}|${r.depositor}`);
