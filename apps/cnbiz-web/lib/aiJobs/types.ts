/**
 * 영속 AI Job 레코드. lib/agents/taskQueue.ts(Development OS의 Claude Code/Cursor/Shell
 * 실행기)는 모듈 메모리(Map)에만 존재해 재배포·서버 재시작·멀티 인스턴스에서 유실되므로,
 * 외부(챗봇)에서 생성되어 admin이 추적해야 하는 Job에는 재사용하지 않는다. 이 레지스트리는
 * CollectionStore(Supabase)에 영속되는 별도 큐이며, 실제 실행기(Website Builder CLI 연동 등)는
 * 이번 범위에 포함하지 않는다 — 상태 전이만 정의한다.
 */
/**
 * "generate_planning"(AI Business OS Phase 3, 신규) — 기존 두 값은 무변경. Website Builder처럼
 * 별도 실행기 로직이 필요하지만, 새 저장소를 만들지 않고 이 레코드의 기존 `result` 필드에
 * PlanningContent를 그대로 담는다(lib/aiJobs/executor.ts의 executePlanningJob() 참고).
 */
export type AiJobType = "generate_website" | "generate_content" | "generate_planning";

export type AiJobStatus = "Queued" | "Running" | "Success" | "Failed" | "Cancelled";

export const AI_JOB_STATUSES: AiJobStatus[] = ["Queued", "Running", "Success", "Failed", "Cancelled"];

export interface AiJobInput {
  websiteOrderId: string;
  type: AiJobType;
  /** 실행기에 전달할 파라미터(예: siteType, requirements) — 실행기 구현 전까지는 그대로 보관. */
  payload: Record<string, unknown>;
}

export interface AiJobRecord extends AiJobInput {
  id: string;
  status: AiJobStatus;
  progress: number;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
