import type { ContractStore } from "./store";

/**
 * 전체 데이터 백업 (관리자가 내려받아 보관하는 JSON).
 * - 계약 설정, 공통 설정, 제출(서명·연락처·주소 포함), 출퇴근 기록, 정정 이력을 모두 담는다.
 * - 출퇴근 PIN의 해시·salt와 로그인 시도 기록은 담지 않는다. 비밀값이고, 복구할 때는 PIN을 새로 만드는 편이 안전하다.
 * - 이 파일에는 근로자의 개인정보가 들어 있다. 내보내는 쪽(라우트)은 관리자만 받게 한다.
 */

export const BACKUP_VERSION = 1;

export interface Backup {
  app: "saseokchanmi-contract";
  version: number;
  exportedAt: string;
  notes: string[];
  counts: { configs: number; submissions: number; clockEvents: number; clockAudit: number };
  settings: Awaited<ReturnType<ContractStore["getSettings"]>>;
  configs: Awaited<ReturnType<ContractStore["listConfigs"]>>;
  submissions: Awaited<ReturnType<ContractStore["listSubmissions"]>>;
  clockEvents: Awaited<ReturnType<ContractStore["listClockEvents"]>>;
  clockAudit: Awaited<ReturnType<ContractStore["listClockAudit"]>>;
}

export async function buildBackup(store: ContractStore, now: Date = new Date()): Promise<Backup> {
  const [settings, configs, submissions, clockEvents, clockAudit] = await Promise.all([
    store.getSettings(),
    store.listConfigs(),
    store.listSubmissions(),
    store.listClockEvents(),
    store.listClockAudit(),
  ]);
  return {
    app: "saseokchanmi-contract",
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    notes: [
      "근로자의 성명·연락처·주소·서명 이미지가 들어 있는 개인정보 파일입니다. 안전한 곳에만 보관하고 메신저·메일로 보내지 마세요.",
      "출퇴근 PIN과 로그인 시도 기록은 포함하지 않았습니다. 복구가 필요하면 PIN은 새로 만들어 주세요.",
      "시각은 모두 UTC(ISO 8601)입니다. 한국 시간은 +9시간입니다.",
    ],
    counts: { configs: configs.length, submissions: submissions.length, clockEvents: clockEvents.length, clockAudit: clockAudit.length },
    settings,
    configs,
    submissions,
    clockEvents,
    clockAudit,
  };
}
