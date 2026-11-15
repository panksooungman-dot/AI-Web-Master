/** 출퇴근 시각 표시(한국 시간). 서버는 ISO(UTC)로 저장하고 화면에서만 한국 시간으로 보여 준다. */
const TZ = "Asia/Seoul";

export const fmtClockTime = (iso: string | number | Date): string =>
  new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

export const fmtClockDateTime = (iso: string): string =>
  new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, month: "numeric", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
