import type { CompanySettings, ContractConfig, InsForm } from "../types";

/** 계약 데이터 저장소 인터페이스. 지금은 파일/메모리 구현이 있고, 운영용(Neon) 구현은 다음 단계에서 같은 인터페이스로 추가한다. */

/** 직원 계약 설정(contract_config). `config`에는 공통 설정 항목을 넣지 않는다. */
export interface ConfigRecord {
  token: string;
  config: Partial<ContractConfig>;
  createdAt: string;
  updatedAt: string;
}

/** 공통 설정(company_settings) + 관리자 설정 최저시급. */
export interface SettingsRecord {
  company: CompanySettings;
  minWage: number;
  updatedAt: string;
}

/** 제출(contract_submission). `configSnapshot`은 서명 시점의 전체 설정 복사본이다. */
export interface SubmissionRecord {
  id: string;
  configToken: string;
  configSnapshot: ContractConfig;
  name: string;
  phone: string;
  address: string;
  sig: string;
  signedAt: string;
  insForm: InsForm | null;
  ownerSig: string | null;
  countersignedAt: string | null;
  editedAt: string | null;
}

export interface LoginAttempt {
  key: string;
  count: number;
  firstAt: number;
  lockedUntil: number;
}

/** 직원(확정된 계약 건)별 출퇴근 PIN. PIN 자체는 저장하지 않고 salt와 해시만 보관한다. */
export interface ClockPinRecord {
  submissionId: string;
  hash: string;
  salt: string;
  updatedAt: string;
}

/** 출퇴근 기록 한 건. `at`은 서버 시각(ISO). 관리자가 정정해 넣은 기록은 source가 "admin"이다. */
export interface ClockEventRecord {
  id: string;
  submissionId: string;
  kind: "in" | "out";
  at: string;
  source: "device" | "admin";
  note: string;
}

export interface ContractStore {
  listConfigs(): Promise<ConfigRecord[]>;
  getConfig(token: string): Promise<ConfigRecord | null>;
  putConfig(rec: ConfigRecord): Promise<void>;
  deleteConfig(token: string): Promise<boolean>;

  getSettings(): Promise<SettingsRecord | null>;
  putSettings(rec: SettingsRecord): Promise<void>;

  listSubmissions(): Promise<SubmissionRecord[]>;
  getSubmission(id: string): Promise<SubmissionRecord | null>;
  getSubmissionByToken(token: string): Promise<SubmissionRecord | null>;
  /** 한 직원 계약(토큰)당 제출은 1건만 허용한다. 이미 있으면 false. */
  insertSubmission(rec: SubmissionRecord): Promise<boolean>;
  updateSubmission(id: string, patch: Partial<SubmissionRecord>): Promise<SubmissionRecord | null>;
  deleteSubmission(id: string): Promise<boolean>;

  listClockPins(): Promise<ClockPinRecord[]>;
  getClockPin(submissionId: string): Promise<ClockPinRecord | null>;
  putClockPin(rec: ClockPinRecord): Promise<void>;
  deleteClockPin(submissionId: string): Promise<boolean>;
  insertClockEvent(rec: ClockEventRecord): Promise<void>;
  /** `from` 이상 `to` 미만(ISO 문자열)의 기록을 시간 오름차순으로. 조건은 모두 선택. */
  listClockEvents(opts?: { from?: string; to?: string; submissionId?: string }): Promise<ClockEventRecord[]>;
  /** 직원별 가장 최근 기록 1건(현재 출근 중인지 판단용). */
  lastClockEvents(): Promise<Record<string, ClockEventRecord>>;

  getAttempt(key: string): Promise<LoginAttempt | null>;
  putAttempt(a: LoginAttempt): Promise<void>;
  clearAttempt(key: string): Promise<void>;
}

/** 저장소를 쓸 수 없는 환경(운영에서 DB 미연결 등). 라우트는 이 오류를 503으로 바꿔 보여 준다. */
export class StoreNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreNotReadyError";
  }
}
