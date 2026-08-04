/**
 * 프로젝트 일정 자동 생성 — lib/estimates·lib/specifications와 완전히 동일한 원칙의 신규 독립
 * 서비스. 다른 점은 입력 하나가 AIAnalysisResult뿐 아니라 이미 생성된 EstimateRecord·
 * SpecificationRecord도 함께 사용한다는 것 — 그래도 저 두 Domain의 파일은 한 줄도 import해서
 * 수정하지 않고, 오직 그 registry의 조회 함수(getEstimate 등)만 읽기 전용으로 호출한다
 * (lib/estimates/generator.ts가 lib/inquiries를 import하지 않는 것과 동일한 "읽기만, 쓰기는
 * 자신의 registry에만" 원칙).
 */
export interface TimelinePhase {
  name: string;
  description: string;
  durationDays: number;
  startOffsetDays: number;
}

export interface TimelineMilestone {
  name: string;
  description: string;
  dueOffsetDays: number;
}

export interface TimelineWeek {
  weekNumber: number;
  focus: string;
  tasks: string[];
}

/** AI(또는 결정론적 폴백)가 판단하는 부분. */
export interface TimelineJudgment {
  overview: string;
  totalDurationWeeks: number;
  totalDurationDays: number;
  phases: TimelinePhase[];
  milestones: TimelineMilestone[];
  weeklyPlan: TimelineWeek[];
  assumptions: string[];
}

export type TimelineResult = TimelineJudgment;

export interface TimelineInput {
  companyName: string;
  detectedBusinessType: string;
  requirements: string;
  pageCount: number;
  featureCount: number;
  scopeIncluded: string[];
  estimateTimelineWeeks: number;
}

export interface TimelineRecord {
  id: string;
  inquiryId: string;
  websiteOrderId: string;
  estimateId: string;
  specificationId: string;
  input: TimelineInput;
  result: TimelineResult;
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}
