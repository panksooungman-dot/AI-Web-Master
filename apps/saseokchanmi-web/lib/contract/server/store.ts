import type { PayrollInput, PayrollRates, PayStatement } from "../payroll";
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

/** 급여 설정: 사업주가 정한 공제율과 근무시간 계산 방식. rates는 사업주가 직접 입력한 값이고, 자동 적용이 켜져 있으면 그 해의 법정 요율(statutory-rates.ts)이 우선한다. */
export interface PayrollSettingsRecord {
  rates: PayrollRates;
  /** 법정 요율 자동 적용. 없거나 true면 켜진 것으로 본다(그 해의 요율이 표에 있을 때만 적용). */
  autoRates?: boolean;
  /** 약정 휴게시간을 근무시간에서 자동으로 뺄지 */
  deductBreak: boolean;
  updatedAt: string;
}

/** 확정된 급여명세서(직원·달마다 1건). 다시 확정하면 차수가 올라가고 이전 금액은 history에 남는다. */
export interface PayslipRecord {
  id: string;
  submissionId: string;
  /** 귀속 월 YYYY-MM */
  month: string;
  revision: number;
  confirmedAt: string;
  payDate: string;
  employeeName: string;
  /** 근로자를 특정하는 정보(근로 개시일·관리번호) */
  employeeNo: string;
  biz: string;
  owner: string;
  /** 확정 시점의 계산 결과. 이후 출퇴근 기록을 고쳐도 이 값은 바뀌지 않는다. */
  statement: PayStatement;
  /** 확정할 때 사업주가 넣은 값(조정·직접 입력) */
  input: PayrollInput;
  history: { revision: number; confirmedAt: string; gross: number; net: number }[];
}

/** 입금 확인(계좌이체 결제). 금액·입금자명·시각만 저장하고 계좌번호·잔액은 저장하지 않는다. */
export interface DepositRecord {
  id: string;
  /** 원. 해석 실패 건은 0 */
  amount: number;
  /** 해석 실패 건은 "(해석 실패)" */
  depositor: string;
  /** 은행 문자에 찍힌 입금 시각(ISO) */
  occurredAt: string;
  /** 서버가 문자를 받은 시각(ISO) */
  receivedAt: string;
  /** 직원이 계산서와 대조해 확인한 시각. 아직이면 null */
  confirmedAt: string | null;
  /** 직원 메모(테이블 번호 등). 해석 실패 건은 문자 원문 일부 */
  memo: string;
  /** 문자를 해석하지 못해 원문 일부를 남긴 건 */
  unparsed?: boolean;
}

export interface DepositSettings {
  /** 사장님이 추가한 제외 입금자명(기본으로 "카드"는 항상 제외) */
  excludeNames: string[];
  /** 입금 문자를 마지막으로 받은 시각(폰·인터넷 연결 확인용). 한 번도 없으면 null */
  lastIngestAt: string | null;
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

/** 관리자가 출퇴근 기록을 추가·수정·삭제한 이력. 수정 전/후 내용과 사유를 남겨서 나중에 무엇이 바뀌었는지 확인할 수 있다. */
export interface ClockAuditRecord {
  id: string;
  eventId: string;
  submissionId: string;
  action: "add" | "edit" | "delete";
  before: Pick<ClockEventRecord, "kind" | "at"> | null;
  after: Pick<ClockEventRecord, "kind" | "at"> | null;
  reason: string;
  /** 정정한 시각(서버 시각, ISO) */
  at: string;
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
  getClockEvent(id: string): Promise<ClockEventRecord | null>;
  updateClockEvent(id: string, patch: Partial<Pick<ClockEventRecord, "kind" | "at" | "source" | "note">>): Promise<ClockEventRecord | null>;
  deleteClockEvent(id: string): Promise<boolean>;
  insertClockAudit(rec: ClockAuditRecord): Promise<void>;
  /** `from` 이상 `to` 미만(정정한 시각 기준)의 이력을 시간 오름차순으로. 조건은 모두 선택. */
  listClockAudit(opts?: { from?: string; to?: string; submissionId?: string }): Promise<ClockAuditRecord[]>;

  getPayrollSettings(): Promise<PayrollSettingsRecord | null>;
  putPayrollSettings(rec: PayrollSettingsRecord): Promise<void>;
  /** 확정된 명세서 목록(귀속 월 내림차순, 같은 달은 확정 시각 내림차순). 조건은 모두 선택. */
  listPayslips(opts?: { month?: string; submissionId?: string }): Promise<PayslipRecord[]>;
  getPayslip(submissionId: string, month: string): Promise<PayslipRecord | null>;
  /** 직원·달이 같으면 덮어쓴다(다시 확정). */
  putPayslip(rec: PayslipRecord): Promise<void>;

  /** 같은 입금(시각·금액·입금자명)이 이미 있으면 저장하지 않고 false. 해석 실패 건은 항상 저장한다. */
  insertDeposit(rec: DepositRecord): Promise<boolean>;
  /** `from` 이상 `to` 미만(입금 시각, ISO)을 최신 입금부터. 조건은 모두 선택. */
  listDeposits(opts?: { from?: string; to?: string }): Promise<DepositRecord[]>;
  updateDeposit(id: string, patch: Partial<Pick<DepositRecord, "confirmedAt" | "memo">>): Promise<DepositRecord | null>;
  /** 입금 시각이 `before`(ISO)보다 이전인 건을 정리하고 정리한 개수를 돌려준다. */
  purgeDepositsBefore(before: string): Promise<number>;
  getDepositSettings(): Promise<DepositSettings>;
  putDepositExcludes(names: string[]): Promise<void>;
  /** 입금 문자를 받았음을 기록한다(마지막 수신 시각). */
  touchDepositIngest(at: string): Promise<void>;

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
