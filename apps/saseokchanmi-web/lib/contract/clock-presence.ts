import { fmtMin } from "./clock-sheet";

/** 지금 출근 중인 직원 현황 (순수 함수). 관리자 화면에서 직원 목록 응답을 가공할 때 쓴다. */

export interface PresenceInput {
  id: string;
  name: string;
  hasPin: boolean;
  status: "in" | "out";
  stale: boolean;
  /** 마지막 기록 시각(ISO). 출근 중이면 출근 시각이다. */
  lastAt: string | null;
}

export interface Presence {
  working: { id: string; name: string; since: string; elapsedMin: number }[];
  /** 전 근무의 퇴근 기록이 없는 직원: 사장님이 정정해야 한다. */
  missing: { id: string; name: string; since: string }[];
  /** 출퇴근 기기를 쓸 수 있는(PIN 있는) 직원 수 */
  total: number;
}

export function buildPresence(employees: PresenceInput[], nowMs: number): Presence {
  const working = employees
    .filter((e) => e.status === "in" && e.lastAt)
    .map((e) => ({ id: e.id, name: e.name, since: e.lastAt as string, elapsedMin: Math.max(0, Math.floor((nowMs - Date.parse(e.lastAt as string)) / 60_000)) }))
    .sort((a, b) => Date.parse(a.since) - Date.parse(b.since) || a.name.localeCompare(b.name, "ko"));
  const missing = employees
    .filter((e) => e.stale && e.lastAt)
    .map((e) => ({ id: e.id, name: e.name, since: e.lastAt as string }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return { working, missing, total: employees.filter((e) => e.hasPin).length };
}

/** "3시간 20분째" 같은 경과 표기. 1분 미만은 "방금". */
export const fmtElapsed = (min: number): string => (min < 1 ? "방금 출근" : `${fmtMin(min)}째`);
