/** 문자열·숫자·시간 포맷 유틸. 서버와 클라이언트가 같은 결과를 내도록 순수 함수로만 둔다. */

const ESC_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** HTML에 넣는 모든 사용자 입력은 반드시 이 함수를 거친다. */
export const esc = (s: unknown): string => String(s ?? "").replace(/[&<>"']/g, (c) => ESC_MAP[c]);

/** 서명 이미지 허용 최대 길이(data URL 문자열 기준). */
export const MAX_SIG_LENGTH = 200000;

/** `data:image/png;base64,`로 시작하고 크기 제한 이내인 이미지만 통과시킨다. 아니면 빈 문자열. */
export const safeImg = (u: unknown): string =>
  typeof u === "string" && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(u) && u.length < MAX_SIG_LENGTH ? u : "";

/** 숫자 이외의 문자를 제거해 정수로 만든다(빈 값은 0). */
export const num = (v: unknown): number => Number(String(v ?? "").replace(/\D/g, "")) || 0;

export const won = (n: number): string => Number(n).toLocaleString("ko-KR") + "원";

/** 소수 첫째 자리까지 반올림한 문자열("8", "7.5"). */
export const nh = (n: number): string => String(Math.round(n * 10) / 10);

const HHMM = /^(\d{1,2}):(\d{2})$/;

/** "HH:MM" → 분. 형식이 틀리면 null. */
export const tm = (t: string | undefined): number | null => {
  const m = HHMM.exec(t || "");
  return m ? +m[1] * 60 + +m[2] : null;
};

/** "09:00" → "09시 00분" (계약서 본문용) */
export const fT = (t: string | undefined): string => {
  const m = HHMM.exec(t || "");
  return m ? String(m[1]).padStart(2, "0") + "시 " + m[2] + "분" : "";
};

/** "14:00" → "오후 2시" (근로자 요약 카드용) */
export const kT = (t: string | undefined): string => {
  const x = tm(t);
  if (x == null) return "";
  const h = Math.floor(x / 60);
  const mi = x % 60;
  return (h < 12 ? "오전 " : "오후 ") + (h % 12 || 12) + "시" + (mi ? " " + mi + "분" : "");
};

/** "2026년 12월 1일" 또는 "2026-12-01" → "2026-12-01". 읽을 수 없으면 "". */
export const koDateToIso = (v: unknown): string => {
  const m = String(v ?? "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0") : "";
};

/** "2026-12-01" → "2026년 12월 1일". 형식이 다르면 "". */
export const isoToKoDate = (v: unknown): string => {
  const m = String(v ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[1] + "년 " + +m[2] + "월 " + +m[3] + "일" : "";
};

/**
 * 계약서에 표시할 날짜. ISO면 한국어 표기로 바꾸고, 이미 한국어 표기(또는 다른 문자열)면 그대로 둔다.
 * 직원 설정에는 ISO(달력 선택값)를 저장하고, 표시할 때만 변환한다.
 */
export const dateKo = (v: unknown): string => isoToKoDate(v) || String(v ?? "");

/** ISO 시각 → "2026년 11월 14일 오후 03:20" (KST). */
export const fmtKST = (iso: string | undefined): string => {
  try {
    return new Date(iso as string).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

/** 입력 중인 전화번호를 하이픈 형식으로 정리한다. */
export const fmtPhone = (v: string): string => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.startsWith("02")) {
    return d.length <= 6 ? d.slice(0, 2) + "-" + d.slice(2) : d.slice(0, 2) + "-" + d.slice(2, d.length - 4) + "-" + d.slice(-4);
  }
  if (d.length <= 7) return d.slice(0, 3) + "-" + d.slice(3);
  return d.length === 11
    ? d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7)
    : d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);
};
